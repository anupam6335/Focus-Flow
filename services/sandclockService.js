/**
 * Sandclock Integration Service
 * Handles sandclock session completion and todo integration
 */

import Todo from '../models/Todo.js';

/**
 * Complete todo when sandclock session finishes
 */
export const completeTodoOnSessionEnd = async (sessionId, userId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { 
        userId, 
        'attachedToSandclock.sessionId': sessionId,
        'attachedToSandclock.active': true,
        status: 'pending'
      },
      { 
        status: 'done',
        'attachedToSandclock.active': false,
        'attachedToSandclock.sessionId': null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (todo) {
      console.log(`✅ Todo "${todo.title}" completed via sandclock session ${sessionId}`);
      return {
        success: true,
        todo,
        message: 'Todo automatically completed from sandclock session'
      };
    }

    return {
      success: false,
      message: 'No active todo found for this sandclock session'
    };
  } catch (error) {
    console.error('Error completing todo from sandclock:', error);
    throw error;
  }
};

/**
 * Get currently attached todo for user
 */
export const getAttachedTodo = async (userId) => {
  try {
    const todo = await Todo.findOne({
      userId,
      'attachedToSandclock.active': true
    }).lean();

    return todo;
  } catch (error) {
    console.error('Error getting attached todo:', error);
    throw error;
  }
};

/**
 * Detach all todos for user (on session reset)
 */
export const detachAllTodos = async (userId) => {
  try {
    const result = await Todo.updateMany(
      { userId, 'attachedToSandclock.active': true },
      { 
        'attachedToSandclock.active': false,
        'attachedToSandclock.sessionId': null,
        updatedAt: new Date()
      }
    );

    return {
      success: true,
      detachedCount: result.modifiedCount,
      message: `Detached ${result.modifiedCount} todos`
    };
  } catch (error) {
    console.error('Error detaching todos:', error);
    throw error;
  }
};