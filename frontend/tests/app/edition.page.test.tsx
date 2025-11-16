// Testes da página pública /[event]/[year]:
// 1) Mockamos useParams para fornecer event/year e fetch para simular respostas.
// 2) Verificamos renderização dos metadados da edição e da lista de artigos.
// 3) Também cobrimos cenário de erro retornado pelo backend.

import { render, screen, waitFor } from "@testing-library/react";
import EditionPage from "@/app/(public)/[event]/[year]/page";

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
  paramsMock.mockReturnValue({ event: "evento-slug", year: "2024" });
});

describe("EditionPage", () => {
  test("mostra detalhes da edição e lista artigos", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        edition: { event_name: "Evento XPTO", year: 2024, description: "Desc" },
        articles: [
          { id: 1, title: "Artigo 1", abstract: "Resumo", created_at: "2024-01-01" },
        ],
      }),
    });

    render(<EditionPage />);

    await waitFor(() => expect(screen.getByText("Evento XPTO")).toBeInTheDocument());
    expect(screen.getByText("Artigo 1")).toBeInTheDocument();
  });

  test("exibe mensagem de erro quando o backend responde com falha", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Edição não encontrada" } }),
    });

    render(<EditionPage />);

    await waitFor(() =>
      expect(screen.getByText("Edição não encontrada")).toBeInTheDocument()
    );
  });
});
