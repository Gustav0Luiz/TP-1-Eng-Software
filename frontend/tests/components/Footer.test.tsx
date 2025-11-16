// Este arquivo garante a renderização correta do Footer:
// 1) Mockamos next/link e next/image para evitar dependências externas.
// 2) Verificamos se o ano dinâmico e os links secundários aparecem.
// 3) Mantemos comentários para destacar cada fase do teste.

import { render, screen } from "@testing-library/react";
import Footer from "@/app/components/Footer";

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("next/image", () => (props: any) => <img alt={props.alt} {...props} />);

describe("Footer", () => {
  test("mostra links de navegação e o ano corrente", () => {
    // Arrange + Act
    render(<Footer />);

    // Assert
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Vlib. Todos os direitos reservados.`)).toBeInTheDocument();
    expect(screen.getByText("Sobre")).toBeInTheDocument();
    expect(screen.getByText("Contato")).toBeInTheDocument();
    expect(screen.getByText("Política de Privacidade")).toBeInTheDocument();
  });
});
