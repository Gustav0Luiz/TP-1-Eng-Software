// Este arquivo testa a página pública de Login:
// 1) Mockamos useAuth e o router do Next para verificar chamadas de login e redirects.
// 2) Validamos mensagens de erro quando campos obrigatórios não são preenchidos.
// 3) Garantimos que um submit bem-sucedido normaliza o nickname e redireciona corretamente.
// 4) Deixamos comentários em cada passo para facilitar o entendimento do fluxo Arrange–Act–Assert.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "@/app/(public)/login/page";

const pushMock = jest.fn();
const loginMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("next/image", () => (props: any) => <img alt={props.alt} {...props} />);

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: loginMock }),
}));

jest.mock("@/app/components/Footer", () => () => <div data-testid="footer-mock">Footer mock</div>);

describe("Login page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    loginMock.mockReset();
  });

  test("exibe mensagem de erro quando nickname não é informado", () => {
    // Arrange
    loginMock.mockResolvedValue({});
    render(<Login />);

    // Act: submete com campos vazios
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    // Assert
    expect(screen.getByText("Informe seu nome de usuário.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  test("realiza login e redireciona usando o nickname normalizado", async () => {
    // Arrange
    loginMock.mockResolvedValue({});
    render(<Login />);

    const nicknameInput = screen.getByLabelText("Nome de usuário");
    const passwordInput = screen.getByLabelText("Senha");
    const submitButton = screen.getByRole("button", { name: /Entrar/i });

    // Act: preenche campos com nickname que deve ser normalizado
    fireEvent.change(nicknameInput, { target: { value: "  User Name! " } });
    fireEvent.change(passwordInput, { target: { value: "senhaSegura" } });
    fireEvent.click(submitButton);

    // Assert: aguarda chamada do hook e confirma parâmetros
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("username", "senhaSegura"));
    expect(pushMock).toHaveBeenCalledWith("/user/username");
  });
});
