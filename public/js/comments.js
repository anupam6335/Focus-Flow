// FocusFlow Comments System
// Threaded, Node-Based Structure

class CommentsSystem {
  constructor() {
    this.commentsData = null;
    this.commentsContainer = null;
    this.currentUser = { id: 'user1', name: 'You', avatar: 'U' };
    this.commentCounter = 1;
    
    this.init();
  }
  
  async init() {
    // Load dummy data
    await this.loadDummyData();
    
    // Initialize DOM elements
    this.commentsContainer = document.getElementById('comments-list');
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Render comments
    this.renderComments();
  }
  
  async loadDummyData() {
    // Create dummy data structure
    this.commentsData = {
      comments: [
        {
          id: 'c1',
          author: { id: 'a1', name: 'Alice Smith', avatar: 'AS' },
          content: 'Excellent breakdown of DP patterns! The 0/1 Knapsack explanation was particularly helpful for my interview prep.',
          timestamp: '2 hours ago',
          likes: 24,
          upvotes: 18,
          downvotes: 2,
          isPinned: true,
          isLiked: false,
          isUpvoted: false,
          isDownvoted: false,
          replies: [
            {
              id: 'c1r1',
              author: { id: 'a2', name: 'Bob Johnson', avatar: 'BJ' },
              content: 'Agreed! The coin change example was exactly what I needed for my dynamic programming assignment.',
              timestamp: '1 hour ago',
              likes: 8,
              upvotes: 6,
              downvotes: 0,
              isLiked: true,
              isUpvoted: false,
              isDownvoted: false,
              replies: [
                {
                  id: 'c1r1r1',
                  author: { id: 'a3', name: 'Charlie Brown', avatar: 'CB' },
                  content: 'I found the memoization vs tabulation comparison super useful. Clear examples!',
                  timestamp: '45 minutes ago',
                  likes: 3,
                  upvotes: 3,
                  downvotes: 0,
                  isLiked: false,
                  isUpvoted: true,
                  isDownvoted: false,
                  replies: []
                },
                {
                  id: 'c1r1r2',
                  author: { id: 'a4', name: 'Diana Prince', avatar: 'DP' },
                  content: 'Could you elaborate more on the space optimization techniques for DP?',
                  timestamp: '30 minutes ago',
                  likes: 5,
                  upvotes: 4,
                  downvotes: 1,
                  isLiked: false,
                  isUpvoted: false,
                  isDownvoted: false,
                  replies: []
                }
              ]
            },
            {
              id: 'c1r2',
              author: { id: 'a5', name: 'Ethan Hunt', avatar: 'EH' },
              content: 'The climbing stairs problem is a classic! Good to see it explained so clearly.',
              timestamp: '50 minutes ago',
              likes: 12,
              upvotes: 9,
              downvotes: 1,
              isLiked: false,
              isUpvoted: false,
                  isDownvoted: false,
              replies: [
                {
                  id: 'c1r2r1',
                  author: { id: 'a1', name: 'Alice Smith', avatar: 'AS' },
                  content: 'Thanks! Yes, it\'s a great introductory problem to understand DP concepts.',
                  timestamp: '40 minutes ago',
                  likes: 4,
                  upvotes: 3,
                  downvotes: 0,
                  isLiked: false,
                  isUpvoted: false,
                  isDownvoted: false,
                  replies: []
                }
              ]
            },
            {
              id: 'c1r3',
              author: { id: 'a6', name: 'Fiona Gallagher', avatar: 'FG' },
              content: 'I\'ve been struggling with DP for weeks. This article finally made it click!',
              timestamp: '25 minutes ago',
              likes: 15,
              upvotes: 11,
              downvotes: 0,
              isLiked: false,
              isUpvoted: true,
              isDownvoted: false,
              replies: []
            }
          ]
        },
        {
          id: 'c2',
          author: { id: 'a7', name: 'George Miller', avatar: 'GM' },
          content: 'Great article! Could you add examples for more complex DP patterns like interval DP or bitmask DP?',
          timestamp: '3 hours ago',
          likes: 18,
          upvotes: 14,
          downvotes: 3,
          isPinned: false,
          isLiked: false,
          isUpvoted: false,
          isDownvoted: false,
          replies: [
            {
              id: 'c2r1',
              author: { id: 'a8', name: 'Hannah Baker', avatar: 'HB' },
              content: 'Second this! More advanced examples would be super helpful for competitive programming.',
              timestamp: '2 hours ago',
              likes: 7,
              upvotes: 5,
              downvotes: 1,
              isLiked: false,
              isUpvoted: false,
              isDownvoted: false,
              replies: []
            }
          ]
        }
      ],
      totalComments: 8
    };
  }
  
  initEventListeners() {
    // Main comment form
    const postButton = document.getElementById('post-comment-btn');
    const commentTextarea = document.getElementById('comment-textarea');
    
    if (postButton && commentTextarea) {
      commentTextarea.addEventListener('input', (e) => {
        this.updateCharacterCount(e.target);
        this.togglePostButton(e.target);
      });
      
      postButton.addEventListener('click', () => {
        this.addNewComment(commentTextarea.value.trim());
        commentTextarea.value = '';
        this.updateCharacterCount(commentTextarea);
        this.togglePostButton(commentTextarea);
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to post comment
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && commentTextarea === document.activeElement) {
        e.preventDefault();
        if (postButton && !postButton.disabled) {
          postButton.click();
        }
      }
    });
  }
  
  updateCharacterCount(textarea) {
    const charCount = document.getElementById('char-count');
    if (!charCount) return;
    
    const length = textarea.value.length;
    charCount.textContent = `${length}/500`;
    
    charCount.classList.remove('near-limit', 'over-limit');
    if (length > 450) {
      charCount.classList.add('near-limit');
    }
    if (length > 500) {
      charCount.classList.add('over-limit');
    }
  }
  
  togglePostButton(textarea) {
    const postButton = document.getElementById('post-comment-btn');
    if (!postButton) return;
    
    const hasContent = textarea.value.trim().length > 0;
    const withinLimit = textarea.value.length <= 500;
    
    postButton.disabled = !hasContent || !withinLimit;
  }
  
  renderComments() {
    if (!this.commentsContainer) return;
    
    this.commentsContainer.innerHTML = '';
    
    if (!this.commentsData || this.commentsData.comments.length === 0) {
      this.commentsContainer.innerHTML = `
        <div class="comments-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      `;
      return;
    }
    
    // Update comment count
    const countElement = document.getElementById('comments-count');
    if (countElement) {
      countElement.textContent = `${this.commentsData.totalComments} comments`;
    }
    
    // Render each comment
    this.commentsData.comments.forEach(comment => {
      const commentElement = this.createCommentElement(comment, 0);
      this.commentsContainer.appendChild(commentElement);
    });
  }
  
  createCommentElement(comment, depth) {
    const li = document.createElement('li');
    li.className = 'comment-item';
    li.dataset.id = comment.id;
    
    // Create comment card
    const card = document.createElement('div');
    card.className = 'comment-card';
    if (comment.isPinned) {
      card.classList.add('pinned');
    }
    
    // Comment header
    const header = document.createElement('div');
    header.className = 'comment-header';
    
    // Author info
    const authorDiv = document.createElement('div');
    authorDiv.className = 'comment-author';
    
    const avatar = document.createElement('div');
    avatar.className = 'author-avatar-small';
    avatar.textContent = comment.author.avatar;
    
    const authorInfo = document.createElement('div');
    authorInfo.className = 'author-info-small';
    
    const authorName = document.createElement('span');
    authorName.className = 'author-name-small';
    authorName.textContent = comment.author.name;
    
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      ${comment.timestamp}
    `;
    
    meta.appendChild(timestamp);
    authorInfo.appendChild(authorName);
    authorInfo.appendChild(meta);
    authorDiv.appendChild(avatar);
    authorDiv.appendChild(authorInfo);
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    
    // Action buttons array with tooltips
    const actionButtons = [
      { 
        class: 'edit-btn', 
        tooltip: 'Edit', 
        svg: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>'
      },
      { 
        class: 'delete-btn', 
        tooltip: 'Delete', 
        svg: '<path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
      },
      { 
        class: 'like-btn', 
        tooltip: 'Like', 
        svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
        count: comment.likes,
        active: comment.isLiked
      },
      { 
        class: 'upvote-btn', 
        tooltip: 'Upvote', 
        svg: '<path d="M18 15l-6-6-6 6"></path>',
        count: comment.upvotes,
        active: comment.isUpvoted
      },
      { 
        class: 'downvote-btn', 
        tooltip: 'Downvote', 
        svg: '<path d="M6 9l6 6 6-6"></path>',
        count: comment.downvotes,
        active: comment.isDownvoted
      }
    ];
    
    // Add pin button only for top-level comments
    if (depth === 0) {
      actionButtons.unshift({
        class: 'pin-btn',
        tooltip: comment.isPinned ? 'Unpin' : 'Pin',
        svg: '<path d="M12 17v5"></path><path d="M9 10v12"></path><path d="M15 10v12"></path><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.73V7h-2v3.73a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>'
      });
    }
    
    // Create action buttons
    actionButtons.forEach(btn => {
      const actionBtn = document.createElement('button');
      actionBtn.className = `action-icon ${btn.class}`;
      if (btn.active) {
        actionBtn.classList.add('active');
      }
      
      // Add tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = btn.tooltip;
      actionBtn.appendChild(tooltip);
      
      // Add SVG icon
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.5');
      svg.innerHTML = btn.svg;
      actionBtn.appendChild(svg);
      
      // Add count if present
      if (btn.count !== undefined) {
        const count = document.createElement('span');
        count.className = 'action-count';
        count.textContent = btn.count;
        actionBtn.appendChild(count);
      }
      
      // Add event listeners
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAction(btn.class, comment.id);
      });
      
      actions.appendChild(actionBtn);
    });
    
    header.appendChild(authorDiv);
    header.appendChild(actions);
    
    // Comment content
    const content = document.createElement('div');
    content.className = 'comment-content';
    content.innerHTML = `<p>${comment.content}</p>`;
    
    // Edit form (hidden by default)
    const editForm = document.createElement('div');
    editForm.className = 'comment-edit-form';
    editForm.innerHTML = `
      <textarea placeholder="Edit your comment...">${comment.content}</textarea>
      <div class="edit-form-actions">
        <button class="edit-form-btn edit-form-cancel">Cancel</button>
        <button class="edit-form-btn edit-form-save">Save</button>
      </div>
    `;
    
    // Reply button
    const replyButton = document.createElement('button');
    replyButton.className = 'reply-btn';
    replyButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      Reply
    `;
    
    replyButton.addEventListener('click', () => {
      this.toggleReplyForm(comment.id);
    });
    
    // Reply form (hidden by default)
    const replyForm = document.createElement('div');
    replyForm.className = 'reply-form-container';
    replyForm.innerHTML = `
      <div class="reply-form">
        <textarea placeholder="Write your reply..." rows="2"></textarea>
        <div class="reply-form-actions">
          <button class="reply-form-btn reply-form-cancel">Cancel</button>
          <button class="reply-form-btn reply-form-submit">Reply</button>
        </div>
      </div>
    `;
    
    // Assemble the card
    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(editForm);
    card.appendChild(replyButton);
    card.appendChild(replyForm);
    
    li.appendChild(card);
    
    // Nested replies
    if (comment.replies && comment.replies.length > 0) {
      const nestedDiv = document.createElement('div');
      nestedDiv.className = 'nested-comments';
      
      comment.replies.forEach(reply => {
        const replyElement = this.createCommentElement(reply, depth + 1);
        nestedDiv.appendChild(replyElement);
      });
      
      li.appendChild(nestedDiv);
    }
    
    return li;
  }
  
  handleAction(actionType, commentId) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    switch(actionType) {
      case 'edit-btn':
        this.toggleEditMode(commentId);
        break;
      case 'delete-btn':
        this.deleteComment(commentId);
        break;
      case 'like-btn':
        this.toggleLike(commentId);
        break;
      case 'upvote-btn':
        this.toggleUpvote(commentId);
        break;
      case 'downvote-btn':
        this.toggleDownvote(commentId);
        break;
      case 'pin-btn':
        this.togglePin(commentId);
        break;
    }
  }
  
  findComment(comments, id) {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies && comment.replies.length > 0) {
        const found = this.findComment(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  }
  
  toggleEditMode(commentId) {
    const commentElement = document.querySelector(`[data-id="${commentId}"] .comment-card`);
    if (!commentElement) return;
    
    commentElement.classList.toggle('editing');
    
    if (commentElement.classList.contains('editing')) {
      const textarea = commentElement.querySelector('.comment-edit-form textarea');
      const cancelBtn = commentElement.querySelector('.edit-form-cancel');
      const saveBtn = commentElement.querySelector('.edit-form-save');
      
      if (textarea) textarea.focus();
      
      if (cancelBtn) {
        cancelBtn.onclick = () => commentElement.classList.remove('editing');
      }
      
      if (saveBtn) {
        saveBtn.onclick = () => {
          const newContent = textarea.value.trim();
          if (newContent) {
            this.updateCommentContent(commentId, newContent);
            commentElement.classList.remove('editing');
          }
        };
      }
    }
  }
  
  updateCommentContent(commentId, newContent) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    comment.content = newContent;
    this.renderComments();
  }
  
  deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    this.removeComment(this.commentsData.comments, commentId);
    this.commentsData.totalComments--;
    this.renderComments();
  }
  
  removeComment(comments, id) {
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].id === id) {
        // Remove nested comments from total count
        if (comments[i].replies) {
          this.commentsData.totalComments -= this.countReplies(comments[i]);
        }
        comments.splice(i, 1);
        return true;
      }
      if (comments[i].replies && this.removeComment(comments[i].replies, id)) {
        return true;
      }
    }
    return false;
  }
  
  countReplies(comment) {
    let count = 0;
    if (comment.replies) {
      count += comment.replies.length;
      comment.replies.forEach(reply => {
        count += this.countReplies(reply);
      });
    }
    return count;
  }
  
  toggleLike(commentId) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    comment.isLiked = !comment.isLiked;
    comment.likes += comment.isLiked ? 1 : -1;
    this.renderComments();
  }
  
  toggleUpvote(commentId) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    if (comment.isDownvoted) {
      comment.isDownvoted = false;
      comment.downvotes--;
    }
    
    comment.isUpvoted = !comment.isUpvoted;
    comment.upvotes += comment.isUpvoted ? 1 : -1;
    this.renderComments();
  }
  
  toggleDownvote(commentId) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    if (comment.isUpvoted) {
      comment.isUpvoted = false;
      comment.upvotes--;
    }
    
    comment.isDownvoted = !comment.isDownvoted;
    comment.downvotes += comment.isDownvoted ? 1 : -1;
    this.renderComments();
  }
  
  togglePin(commentId) {
    const comment = this.findComment(this.commentsData.comments, commentId);
    if (!comment) return;
    
    // Unpin all other comments first
    this.unpinAllComments(this.commentsData.comments);
    
    // Toggle pin for this comment
    comment.isPinned = !comment.isPinned;
    this.renderComments();
  }
  
  unpinAllComments(comments) {
    comments.forEach(comment => {
      comment.isPinned = false;
      if (comment.replies) {
        this.unpinAllComments(comment.replies);
      }
    });
  }
  
  toggleReplyForm(commentId) {
    const commentElement = document.querySelector(`[data-id="${commentId}"] .comment-card`);
    if (!commentElement) return;
    
    const replyForm = commentElement.querySelector('.reply-form-container');
    if (!replyForm) return;
    
    replyForm.classList.toggle('active');
    
    if (replyForm.classList.contains('active')) {
      const textarea = replyForm.querySelector('textarea');
      const cancelBtn = replyForm.querySelector('.reply-form-cancel');
      const submitBtn = replyForm.querySelector('.reply-form-submit');
      
      if (textarea) textarea.focus();
      
      if (cancelBtn) {
        cancelBtn.onclick = () => replyForm.classList.remove('active');
      }
      
      if (submitBtn) {
        submitBtn.onclick = () => {
          const replyContent = textarea.value.trim();
          if (replyContent) {
            this.addReply(commentId, replyContent);
            replyForm.classList.remove('active');
            textarea.value = '';
          }
        };
      }
    }
  }
  
  addReply(parentId, content) {
    const parentComment = this.findComment(this.commentsData.comments, parentId);
    if (!parentComment) return;
    
    if (!parentComment.replies) {
      parentComment.replies = [];
    }
    
    const newReply = {
      id: `reply_${Date.now()}`,
      author: this.currentUser,
      content: content,
      timestamp: 'Just now',
      likes: 0,
      upvotes: 0,
      downvotes: 0,
      isLiked: false,
      isUpvoted: false,
      isDownvoted: false,
      replies: []
    };
    
    parentComment.replies.push(newReply);
    this.commentsData.totalComments++;
    this.renderComments();
    
    // Highlight new comment
    setTimeout(() => {
      const newElement = document.querySelector(`[data-id="${newReply.id}"]`);
      if (newElement) {
        newElement.classList.add('new');
      }
    }, 10);
  }
  
  addNewComment(content) {
    const newComment = {
      id: `comment_${Date.now()}`,
      author: this.currentUser,
      content: content,
      timestamp: 'Just now',
      likes: 0,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isLiked: false,
      isUpvoted: false,
      isDownvoted: false,
      replies: []
    };
    
    this.commentsData.comments.push(newComment);
    this.commentsData.totalComments++;
    this.renderComments();
    
    // Scroll to new comment
    setTimeout(() => {
      const newElement = document.querySelector(`[data-id="${newComment.id}"]`);
      if (newElement) {
        newElement.classList.add('new');
        newElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 10);
  }
}

// Initialize comments system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const commentsSystem = new CommentsSystem();
});