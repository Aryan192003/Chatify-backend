const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Internal Error";
  err.statusCode ||= 500;

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicates fileds = ${error}`;
    err.statusCode = 404;
  }

  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid format of ${errorPath}`;
    err.statusCode = 400;
  }
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export { errorMiddleware };
