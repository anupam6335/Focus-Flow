import StructuredTodo from '../models/StructuredTodo.js';

/**
 * Complete todo when sandclock session finishes
 */
export const completeTodoOnSessionEnd = async (sessionId, userId) => {
  try {
    const userTodos = await StructuredTodo.getUserTodos(userId);
    
    // Find the todo with active session
    for (const day of userTodos.days) {
      const todo = day.todos.find(t => 
        t.attachedToSandclock.sessionId === sessionId &&
        t.attachedToSandclock.active === true &&
        t.status === 'pending'
      );
      
      if (todo) {
        todo.status = 'done';
        todo.completed = true;
        todo.attachedToSandclock.active = false;
        todo.attachedToSandclock.sessionId = null;
        todo.updatedAt = new Date();
        
        await userTodos.save();
        
        console.log(`✅ Todo "${todo.title}" completed via sandclock session ${sessionId}`);
        return {
          success: true,
          todo,
          message: 'Todo automatically completed from sandclock session'
        };
      }
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
    const userTodos = await StructuredTodo.getUserTodos(userId);
    
    for (const day of userTodos.days) {
      const todo = day.todos.find(t => t.attachedToSandclock.active === true);
      if (todo) return todo;
    }
    
    return null;
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
    const userTodos = await StructuredTodo.getUserTodos(userId);
    let detachedCount = 0;

    for (const day of userTodos.days) {
      for (const todo of day.todos) {
        if (todo.attachedToSandclock.active) {
          todo.attachedToSandclock.active = false;
          todo.attachedToSandclock.sessionId = null;
          todo.updatedAt = new Date();
          detachedCount++;
        }
      }
    }

    if (detachedCount > 0) {
      await userTodos.save();
    }

    return {
      success: true,
      detachedCount,
      message: `Detached ${detachedCount} todos`
    };
  } catch (error) {
    console.error('Error detaching todos:', error);
    throw error;
  }
};