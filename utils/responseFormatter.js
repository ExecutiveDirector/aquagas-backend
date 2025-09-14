exports.success = (data, message = "Success") => ({
    status: "success",
    message,
    data
  });
  
  exports.error = (message = "Error", code = 500) => ({
    status: "error",
    message,
    code
  });
  