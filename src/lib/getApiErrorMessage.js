export default function getApiErrorMessage(error, fallbackMessage) {
  const serverMsg = error?.response?.data?.msg;
  if (serverMsg) return serverMsg;

  const status = error?.response?.status;
  if (status === 413) {
    return "The photo is too large. Please try a smaller image.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please check your network and try again.";
  }

  if (!error?.response) {
    return "There seems to be a network issue. Please check your internet connection or browser cache and try again.";
  }

  return fallbackMessage;
}
