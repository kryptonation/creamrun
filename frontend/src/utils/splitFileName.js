export function splitFileName(url) {
  const fileName = url.split("/").pop().split("?")[0];
  const fileExtension = url.split(".").pop();
  return [fileName, fileExtension];
}

export function getLastFourDigits(value) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}