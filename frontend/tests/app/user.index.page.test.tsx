// Testes para src/app/(private)/user/page.tsx:
// 1) Mockamos useAuth e useRouter para verificar redirecionamentos.
// 2) Coberturas: usuário autenticado e visitante anônimo.

import { render, waitFor } from "@testing-library/react";
import UserIndex from "@/app/(private)/user/page";

const replaceMock = jest.fn();
const useAuthMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

jest.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
}));

describe("UserIndex redirect page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthMock.mockReset();
  });

  test("redireciona para /login quando não autenticado", async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<UserIndex />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  test("redireciona para /user/[nickname] quando autenticado", async () => {
    useAuthMock.mockReturnValue({ user: { nickname: "tester" }, loading: false });
    render(<UserIndex />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/user/tester"));
  });
});
