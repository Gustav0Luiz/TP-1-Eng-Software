// Este arquivo cobre o Header:
// 1) Mockamos o hook useAuth para simular estados (carregando, anônimo, autenticado).
// 2) Renderizamos o componente com React Testing Library e validamos o que aparece na tela.
// 3) Exercitamos interações básicas (abrir menu mobile, clicar em logout) para garantir acessibilidade e fluxo principal.
// 4) Mantemos comentários em cada etapa (Arrange–Act–Assert) para facilitar a leitura.

import { render, screen, fireEvent } from "@testing-library/react";
import Header from "@/app/components/Header";

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("next/image", () => (props: any) => <img alt={props.alt} {...props} />);

const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Header", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockUseAuth.mockReset();
  });

  test("exibe estado de carregamento enquanto o hook ainda busca dados", () => {
    // Arrange
    mockUseAuth.mockReturnValue({ user: null, loading: true, logout: mockLogout });

    // Act
    render(<Header />);

    // Assert
    expect(screen.getAllByText("Carregando...")[0]).toBeInTheDocument();
  });

  test("renderiza ações de Registrar e Login quando não há usuário", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: mockLogout,
    });

    // Act
    render(<Header />);

    // Assert
    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(screen.getAllByText("Login")[0]).toBeInTheDocument();
  });

  test("mostra saudação e botão de sair quando autenticado", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: { first_name: "Ada", last_name: "Lovelace", nickname: "ada", email: "ada@test", id: 1 },
      loading: false,
      logout: mockLogout,
    });

    // Act
    render(<Header />);

    // Assert
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Sair"));
    expect(mockLogout).toHaveBeenCalled();
  });

  test("abre e fecha o menu mobile, garantindo que o botão recebe o foco de volta", () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: mockLogout,
    });
    render(<Header />);
    const toggle = screen.getByRole("button", { name: /Abrir menu/i });

    // Act: abre o menu
    fireEvent.click(toggle);

    // Assert: menu aparece
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Act: fecha o menu (botão muda aria-label)
    fireEvent.click(screen.getByRole("button", { name: /Fechar menu/i }));

    // Assert: botão recebe foco novamente
    expect(toggle).toHaveFocus();
  });
});
