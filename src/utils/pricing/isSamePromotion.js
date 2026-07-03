export const isSamePromotion = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;

  if (a.type !== b.type) return false;

  switch (a.type) {
    case "none":
      return true;

    case "percent":
    case "discount":
      return a.value === b.value;

    case "multi":
      return a.buy === b.buy && a.pay === b.pay;

    default:
      return false;
  }
};
