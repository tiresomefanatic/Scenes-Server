class CustomAPIError extends Error {
    constructor(message: string) {
      super(message);
      // Set the prototype explicitly.
      Object.setPrototypeOf(this, CustomAPIError.prototype);
    }
  }
  
  export default CustomAPIError
