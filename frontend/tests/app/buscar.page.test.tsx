// Este arquivo testa a página /buscar:
// 1) Mockamos useRouter/useSearchParams para controlar querystring e capturar redirects.
// 2) Sobrescrevemos Header/Footer para focar nos resultados e na interação da página.
// 3) Simulamos fetch para validar estados (sem resultados, sucesso, envio manual da busca).
// 4) Comentamos cada etapa para destacar o padrão Arrange–Act–Assert.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BuscarPage from "@/app/buscar/page";

const pushMock = jest.fn();
let searchParamsState = new URLSearchParams("");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsState.get(key),
  }),
}));

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("@/app/components/Header", () => () => <div>Header mock</div>);
jest.mock("@/app/components/Footer", () => () => <div>Footer mock</div>);

const fetchMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    value: fetchMock,
    writable: true,
  });
});

beforeEach(() => {
  pushMock.mockReset();
  fetchMock.mockReset();
  searchParamsState = new URLSearchParams("");
});

describe("BuscarPage", () => {
  test("mostra aviso de nenhum resultado quando q está vazio", async () => {
    // Arrange: sem parâmetros na URL
    searchParamsState = new URLSearchParams("");

    // Act
    render(<BuscarPage />);

    // Assert: nenhum fetch deve ocorrer e a mensagem aparece
    await waitFor(() =>
      expect(
        screen.getByText("Nenhum resultado encontrado. Tente ajustar sua busca.")
      ).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("carrega resultados quando há query e exibe contagem correta", async () => {
    // Arrange
    searchParamsState = new URLSearchParams("q=AI&field=event");
    const apiData = [
      { id: 1, title: "Artigo Velho", edition_year: 2020, event_name: "Evento X", created_at: "2020-01-01" },
      { id: 2, title: "Artigo Novo", edition_year: 2024, event_name: "Evento Y", created_at: "2024-01-01" },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articles: apiData }),
    });

    // Act
    render(<BuscarPage />);

    // Assert: aguarda carregamento e verifica ordenação/contagem
    await waitFor(() => expect(screen.getByText("Artigo Novo")).toBeInTheDocument());
    expect(screen.getByText("Artigo Velho")).toBeInTheDocument();
    expect(screen.getByText(/Resultados para “AI”/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/articles/search?field=event&q=AI"
    );
  });

  test("submeter uma nova busca dispara router.push com a query atualizada", async () => {
    // Arrange
    searchParamsState = new URLSearchParams("q=Tech&field=title");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });
    render(<BuscarPage />);

    // Aguarda estado inicial para evitar atualizações pendentes
    await waitFor(() =>
      expect(
        screen.getByText("Nenhum resultado encontrado. Tente ajustar sua busca.")
      ).toBeInTheDocument()
    );

    const input = screen.getByPlaceholderText("Buscar artigos, autores, eventos…");
    const select = screen.getByDisplayValue("Título");
    const button = screen.getByRole("button", { name: "Buscar" });

    // Act
    fireEvent.change(input, { target: { value: "Novo Tema" } });
    fireEvent.change(select, { target: { value: "author" } });
    fireEvent.click(button);

    // Assert
    expect(pushMock).toHaveBeenCalledWith("/buscar?q=Novo%20Tema&field=author");
  });
});
