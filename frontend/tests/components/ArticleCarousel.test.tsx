// Este arquivo cobre o componente ArticleCarousel:
// 1) Testamos o retorno nulo quando não há artigos.
// 2) Validamos a navegação manual pelos botões anterior/próximo.
// 3) Exercitamos o auto-play usando timers falsos do Jest.
// 4) Comentamos cada passo para deixar claro o fluxo Arrange–Act–Assert.

import { act, fireEvent, render, screen } from "@testing-library/react";
import ArticleCarousel from "@/app/components/ArticleCarousel";

const sampleArticles = [
  {
    id: 1,
    title: "Primeiro Artigo",
    abstract: "Resumo do primeiro artigo...",
    authors: [{ id: 1, name: "Autor A" }],
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    title: "Segundo Artigo",
    abstract: "Resumo do segundo artigo...",
    authors: [{ id: 2, name: "Autor B" }],
    created_at: "2024-02-01T00:00:00Z",
  },
];

describe("ArticleCarousel", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test("retorna nada quando não há artigos", () => {
    // Arrange + Act
    const { container } = render(<ArticleCarousel articles={[]} />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  test("permite navegar pelos artigos com os botões", () => {
    // Arrange
    render(<ArticleCarousel articles={sampleArticles} />);

    // Assert inicial: o primeiro artigo está visível
    expect(screen.getByText("Primeiro Artigo")).toBeInTheDocument();

    // Act: avança para o próximo
    fireEvent.click(screen.getByLabelText("Próximo artigo"));

    // Assert: agora o segundo artigo é exibido
    expect(screen.getByText("Segundo Artigo")).toBeInTheDocument();
  });

  test("auto-play avança automaticamente após o intervalo", () => {
    // Arrange
    jest.useFakeTimers();
    render(<ArticleCarousel articles={sampleArticles} />);

    // Act: adianta 5 segundos (intervalo configurado)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Assert: o segundo artigo deve estar ativo após o auto-play
    expect(screen.getByText("Segundo Artigo")).toBeInTheDocument();
  });
});
