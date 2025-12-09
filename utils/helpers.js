/**
 * Helper Functions
 * Reusable utility functions used throughout the application
 */

/**
 * Generate URL-friendly slug from title
 */
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Check if data changes are compatible for auto-merge
 */
export const areChangesCompatible = (serverData, clientData) => {
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
};

/**
 * Intelligent data merge for conflict resolution
 */
export const mergeDataIntelligently = (serverData, clientData) => {
  try {
    const mergedData = JSON.parse(JSON.stringify(serverData));
    
    clientData.forEach((clientDay, index) => {
      if (index < mergedData.length) {
        const serverDay = mergedData[index];
        
        // Merge question completion status
        clientDay.questions.forEach((clientQuestion, qIndex) => {
          if (qIndex < serverDay.questions.length) {
            serverDay.questions[qIndex].completed = clientQuestion.completed;
          }
        });
        
        // Merge tags
        const mergedTags = [...serverDay.tags];
        clientDay.tags.forEach((clientTag) => {
          if (!mergedTags.some(tag => tag.text === clientTag.text)) {
            mergedTags.push(clientTag);
          }
        });
        serverDay.tags = mergedTags;
        
        // Merge links
        const mergedLinks = [...serverDay.linksArray];
        clientDay.linksArray.forEach((clientLink) => {
          if (!mergedLinks.some(link => link.url === clientLink.url)) {
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
    return serverData; // Fallback to server data
  }
};

/**
 * Ensure backward compatibility for difficulty field
 */
export const ensureDifficultyField = (data) => {
  if (!Array.isArray(data)) return data;

  return data.map((day) => ({
    ...day,
    questions: day.questions.map((question) => ({
      ...question,
      difficulty: question.difficulty || 'Medium',
    })),
  }));
};

/**
 * Extract mentions from content (@username pattern)
 */
export const extractMentions = (content) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};

/**
 * Calculate popularity score for blogs
 */
export const calculatePopularityScore = (blog) => {
  return (blog.likes || 0) + (blog.views || 0);
};

/**
 * Format user data for public profile (exclude sensitive info)
 */
export const formatPublicUserData = (user) => {
  if (!user) return null;
  
  const { password, __v, readNotifications, email, isAdmin, notificationPreferences, ...publicData } = user.toObject ? user.toObject() : user;
  
  return publicData;
};

/**
 * Format user data for admin view (include all fields)
 */
export const formatAdminUserData = (user) => {
  if (!user) return null;
  
  const { password, __v, ...adminData } = user.toObject ? user.toObject() : user;
  
  return adminData;
};


