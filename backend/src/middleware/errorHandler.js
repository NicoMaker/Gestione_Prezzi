// Gestione centralizzata degli errori HTTP

class HttpError extends Error {
  constructor(status, messaggio, extra = {}) {
    super(messaggio);
    this.status = status;
    this.extra = extra;
  }
}

// Wrapper per handler sincroni/asincroni: gli errori finiscono nel middleware
function catchErrors(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ errore: err.message, ...err.extra });
  }
  console.error("Errore non gestito:", err);
  res.status(500).json({ errore: "Errore interno del server" });
}

module.exports = { HttpError, catchErrors, errorHandler };
