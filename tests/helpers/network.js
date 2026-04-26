function maskTokens(value, tokens) {
  if (!value) {
    return value;
  }
  return tokens.reduce((acc, token) => {
    if (!token) {
      return acc;
    }
    return acc.split(token).join("***");
  }, value);
}

function formatRequestForLog(request) {
  const tokens = Array.isArray(request.tokens) ? request.tokens : [];
  const maskedUrl = maskTokens(request.url, tokens);
  const method = request.options && request.options.method ? request.options.method : "GET";
  return method + " " + maskedUrl;
}

export {
  maskTokens,
  formatRequestForLog
};
