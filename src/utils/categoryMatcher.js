import { normalizeProductName } from "./normalize";

const normalizeText = (value = "") => {
  return normalizeProductName(String(value).replace(/_/g, " ").trim());
};

const makeIdFromName = (value = "") => {
  return normalizeText(value).replace(/\s+/g, "_");
};

const levenshteinDistance = (a = "", b = "") => {
  const matrix = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const similarity = (a = "", b = "") => {
  const textA = normalizeText(a);
  const textB = normalizeText(b);

  if (!textA || !textB) return 0;
  if (textA === textB) return 1;

  if (textA.includes(textB) || textB.includes(textA)) {
    return 0.9;
  }

  const distance = levenshteinDistance(textA, textB);
  const maxLength = Math.max(textA.length, textB.length);

  if (maxLength === 0) return 0;

  return 1 - distance / maxLength;
};

export const findBestCategoryMatch = (inputText, categories = []) => {
  const query = normalizeText(inputText);

  if (!query) return null;

  let bestMatch = null;

  categories.forEach((category) => {
    const categoryScore = similarity(query, category.name);

    if (!bestMatch || categoryScore > bestMatch.score) {
      bestMatch = {
        categoryId: category.id,
        categoryName: category.name,
        subcategoryId: null,
        subcategoryName: null,
        score: categoryScore,
        matchedBy: "category",
      };
    }

    const subcategories = category.subcategories ?? [];

    subcategories.forEach((subcategory) => {
      const subcategoryName =
        typeof subcategory === "string" ? subcategory : subcategory.name;

      if (!subcategoryName) return;

      const subcategoryId =
        typeof subcategory === "string"
          ? makeIdFromName(subcategory)
          : (subcategory.id ?? makeIdFromName(subcategory.name));

      const subcategoryScore = similarity(query, subcategoryName);

      if (!bestMatch || subcategoryScore > bestMatch.score) {
        bestMatch = {
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId,
          subcategoryName,
          score: subcategoryScore,
          matchedBy: "subcategory",
        };
      }
    });
  });

  if (!bestMatch || bestMatch.score < 0.45) {
    return null;
  }

  return bestMatch;
};
