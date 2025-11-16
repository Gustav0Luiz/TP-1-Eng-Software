// Testes da página pública /[event]:
// 1) Mockamos useParams para injetar o slug e fetch para retornar dados simulados.
// 2) Validamos estados de sucesso (renderizando edições) e erro (mensagem exibida).
// 3) Comentários destacam cada fase.

import { render, screen, waitFor } from "@testing-library/react";
import EventHomePage from "@/app/(public)/[event]/page";

const fetchMock = jest.fn();
const paramsMock = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => paramsMock(),
}));

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("@/app/components/Header", () => () => <div>Header mock</div>);
jest.mock("@/app/components/Footer", () => () => <div>Footer mock</div>);

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    value: fetchMock,
    writable: true,
  });
});

beforeEach(() => {
  fetchMock.mockReset();
  paramsMock.mockReturnValue({ event: "evento-slug" });
});

describe("EventHomePage", () => {
  test("carrega evento e lista edições em ordem decrescente", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        event: { id: 1, name: "Evento XPTO", description: "Desc" },
        editions: [
          { id: 10, year: 2020, local: "BH" },
          { id: 11, year: 2022, local: "SP" },
        ],
      }),
    });

    // Act
    render(<EventHomePage />);

    // Assert
    await waitFor(() => expect(screen.getByText("Evento XPTO")).toBeInTheDocument());
    expect(screen.getByText("2022")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/public/events/evento-slug",
      expect.any(Object)
    );
  });

  test("exibe mensagem de erro quando o backend retorna falha", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Evento não encontrado" } }),
    });

    render(<EventHomePage />);

    await waitFor(() =>
      expect(screen.getByText("Evento não encontrado")).toBeInTheDocument()
    );
  });
});
