// Este arquivo testa a página inicial (src/app/page.tsx):
// 1) Mockamos Header e Footer para focar na lógica da Home.
// 2) Simulamos o hook useRouter do Next para capturar redirecionamentos.
// 3) Validamos textos principais e o fluxo de busca (preencher campos + submit → router.push).
// 4) Mantemos comentários explicando cada bloco.

import { fireEvent, render, screen } from "@testing-library/react";
import Home from "@/app/page";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("@/app/components/Header", () => () => <div data-testid="header-mock">Header mock</div>);
jest.mock("@/app/components/Footer", () => () => <div data-testid="footer-mock">Footer mock</div>);

describe("Home page", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  test("renderiza textos principais e CTA de alertas", () => {
    // Arrange + Act
    render(<Home />);

    // Assert
    expect(screen.getByText("Busque, explore e acompanhe")).toBeInTheDocument();
    expect(screen.getByText("Ativar alertas por autor")).toBeInTheDocument();
    expect(screen.getByTestId("header-mock")).toBeInTheDocument();
    expect(screen.getByTestId("footer-mock")).toBeInTheDocument();
  });

  test("envia a busca quando o formulário é preenchido corretamente", () => {
    // Arrange
    render(<Home />);
    const input = screen.getByPlaceholderText("Buscar artigos, autores, palavras-chave...");
    const select = screen.getByDisplayValue("Título");
    const button = screen.getByRole("button", { name: /Buscar/i });

    // Act
    fireEvent.change(input, { target: { value: "Inteligência Artificial" } });
    fireEvent.change(select, { target: { value: "author" } });
    fireEvent.click(button);

    // Assert
    expect(pushMock).toHaveBeenCalledWith(
      "/buscar?q=Intelig%C3%AAncia%20Artificial&field=author"
    );
  });
});
