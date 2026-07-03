const getRecencyScore = (lastDate) => {
  if (!lastDate) return 0;

  const days =
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);

  if (days <= 7) return 5;
  if (days <= 30) return 3;
  if (days <= 90) return 1;
  return 0;
};
