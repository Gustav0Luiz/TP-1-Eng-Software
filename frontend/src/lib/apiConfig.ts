const getApiUrl = () => {
  const codespaceName = process.env.NEXT_PUBLIC_CODESPACE_NAME;
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

  if (codespaceName) {
    return `https://${codespaceName}-${backendPort}.app.github.dev`;
  }

  return `http://localhost:${backendPort}`;
};

export const API_URL = getApiUrl();
