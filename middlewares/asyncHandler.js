const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next); // Pass any caught error to next()
  };
  
module.exports = asyncHandler;
  