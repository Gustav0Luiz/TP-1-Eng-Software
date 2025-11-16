// Testes da página /alertas:
// 1) Mockamos fetch para controlar a resposta do backend público.
// 2) Verificamos feedback positivo e negativo na UI.
// 3) Comentamos cada etapa para reforçar o padrão Arrange–Act–Assert.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AlertasPage from "@/app/(public)/alertas/page";

const fetchMock = jest.fn();

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
});

describe("AlertasPage", () => {
  test("exibe mensagem de sucesso ao cadastrar alerta", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    render(<AlertasPage />);

    // Act
    fireEvent.change(screen.getByPlaceholderText("Ex.: Maria Silva"), { target: { value: "Maria Silva" } });
    fireEvent.change(screen.getByPlaceholderText("voce@exemplo.com"), { target: { value: "maria@teste.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar alerta/i }));

    // Assert
    await waitFor(() =>
      expect(
        screen.getByText(/Cadastro realizado!/i)
      ).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/public/alerts/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Maria Silva", email: "maria@teste.com" }),
      })
    );
  });

  test("mostra mensagem de erro quando o backend falha", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "E-mail inválido" } }),
    });
    render(<AlertasPage />);

    // Act
    fireEvent.change(screen.getByPlaceholderText("Ex.: Maria Silva"), { target: { value: "João" } });
    fireEvent.change(screen.getByPlaceholderText("voce@exemplo.com"), { target: { value: "errado" } });
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar alerta/i }));

    // Assert
    await waitFor(() =>
      expect(screen.getByText("E-mail inválido")).toBeInTheDocument()
    );
  });
});
