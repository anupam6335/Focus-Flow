// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper function to check if changes are compatible for auto-merge
function areChangesCompatible(serverData, clientData) {
  try {
    if (!Array.isArray(serverData) || !Array.isArray(clientData)) {
      return false;
    }
    if (Math.abs(serverData.length - clientData.length) > 3) {
      return false;
    }
    let compatibleChanges = true;
    const minLength = Math.min(serverData.length, clientData.length);
    for (let i = 0; i < minLength; i++) {
      const serverDay = serverData[i];
      const clientDay = clientData[i];
      if (serverDay.day !== clientDay.day) {
        compatibleChanges = false;
        break;
      }
      if (
        serverDay.questions.length !== clientDay.questions.length &&
        Math.abs(serverDay.questions.length - clientDay.questions.length) > 2
      ) {
        compatibleChanges = false;
        break;
      }
    }
    return compatibleChanges;
  } catch (error) {
    return false;
  }
}

// Intelligent merge function
function mergeDataIntelligently(serverData, clientData) {
  try {
    const mergedData = JSON.parse(JSON.stringify(serverData));
    clientData.forEach((clientDay, index) => {
      if (index < mergedData.length) {
        const serverDay = mergedData[index];
        clientDay.questions.forEach((clientQuestion, qIndex) => {
          if (qIndex < serverDay.questions.length) {
            serverDay.questions[qIndex].completed = clientQuestion.completed;
          }
        });
        const mergedTags = [...serverDay.tags];
        clientDay.tags.forEach((clientTag) => {
          if (!mergedTags.some((tag) => tag.text === clientTag.text)) {
            mergedTags.push(clientTag);
          }
        });
        serverDay.tags = mergedTags;
        const mergedLinks = [...serverDay.linksArray];
        clientDay.linksArray.forEach((clientLink) => {
          if (!mergedLinks.some((link) => link.url === clientLink.url)) {
            mergedLinks.push(clientLink);
          }
        });
        serverDay.linksArray = mergedLinks;
      } else {
        mergedData.push(clientDay);
      }
    });
    return mergedData;
  } catch (error) {
    return serverData;
  }
}

function generateDefaultData() {
  const TOTAL_DAYS = 1;
  const DEFAULT_QUESTIONS = [
    {
      text: "Two Sum",
      link: "https://leetcode.com/problems/two-sum/",
      difficulty: "Easy",
    },
    {
      text: "Reverse a Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
      difficulty: "Medium",
    },
    {
      text: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
      difficulty: "Medium",
    },
  ];
  const appData = [];
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    appData.push({
      day: day,
      questions: DEFAULT_QUESTIONS.map((q) => ({
        text: q.text,
        link: q.link,
        completed: false,
        difficulty: q.difficulty,
      })),
      tags: [],
      links: "",
      linksArray: [],
    });
  }
  return appData;
}

// Backward compatibility: Ensure existing questions without difficulty get default value
function ensureDifficultyField(data) {
  if (!Array.isArray(data)) return data;
  return data.map((day) => ({
    ...day,
    questions: day.questions.map((question) => ({
      ...question,
      difficulty: question.difficulty || "Medium",
    })),
  }));
}

module.exports = {
  generateSlug,
  areChangesCompatible,
  mergeDataIntelligently,
  generateDefaultData,
  ensureDifficultyField
};