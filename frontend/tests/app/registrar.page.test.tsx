// Este arquivo testa a página pública de Registro:
// 1) Mockamos useAuth.register e o router do Next para validar envio e redirects.
// 2) Garantimos que validações client-side (ex.: senhas diferentes) exibem mensagens amigáveis.
// 3) Confirmamos que, em caso de sucesso, o payload é enviado corretamente e o redirecionamento usa o nickname retornado.
// 4) Comentários destacam o padrão Arrange–Act–Assert.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Registrar from "@/app/(public)/registrar/page";

const pushMock = jest.fn();
const registerMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("next/link", () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

jest.mock("next/image", () => (props: any) => <img alt={props.alt} {...props} />);

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ register: registerMock }),
}));

jest.mock("@/app/components/Footer", () => () => <div>Footer mock</div>);

describe("Registrar page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    registerMock.mockReset();
  });

  test("exibe erro quando as senhas não coincidem", () => {
    // Arrange
    render(<Registrar />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Sobrenome"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Nome de usuário"), { target: { value: "ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "654321" } });

    // Act
    fireEvent.click(screen.getByRole("button", { name: /Criar conta/i }));

    // Assert
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  test("registra usuário e redireciona para /user/[nickname]", async () => {
    // Arrange
    registerMock.mockResolvedValue({ nickname: "cientista" });
    render(<Registrar />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Grace" } });
    fireEvent.change(screen.getByLabelText("Sobrenome"), { target: { value: "Hopper" } });
    fireEvent.change(screen.getByLabelText("Nome de usuário"), { target: { value: "grace.h" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "grace@navy.mil" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "cobol123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "cobol123" } });

    // Act
    fireEvent.click(screen.getByRole("button", { name: /Criar conta/i }));

    // Assert: aguarda envio do payload
    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        first_name: "Grace",
        last_name: "Hopper",
        nickname: "grace.h",
        email: "grace@navy.mil",
        password: "cobol123",
      })
    );
    expect(pushMock).toHaveBeenCalledWith("/user/cientista");
  });
});
