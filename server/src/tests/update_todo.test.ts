
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type CreateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

// Test inputs
const createInput: CreateTodoInput = {
  title: 'Original Todo',
  description: 'Original description'
};

const updateInput: UpdateTodoInput = {
  id: 1, // Will be set dynamically in tests
  title: 'Updated Todo',
  description: 'Updated description',
  completed: true
};

// Helper function to create a todo directly in the database
const createTodoInDb = async (input: CreateTodoInput) => {
  const result = await db.insert(todosTable)
    .values({
      title: input.title,
      description: input.description ?? null
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a todo', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Update the todo with all fields
    const updateData = {
      ...updateInput,
      id: createdTodo.id
    };
    
    const result = await updateTodo(updateData);

    // Verify updated fields
    expect(result.id).toEqual(createdTodo.id);
    expect(result.title).toEqual('Updated Todo');
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(true);
    expect(result.created_at).toEqual(createdTodo.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should update only title field', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Update only the title
    const updateData: UpdateTodoInput = {
      id: createdTodo.id,
      title: 'Only Title Updated'
    };
    
    const result = await updateTodo(updateData);

    // Verify only title was updated
    expect(result.title).toEqual('Only Title Updated');
    expect(result.description).toEqual(createdTodo.description);
    expect(result.completed).toEqual(createdTodo.completed);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should update only completed status', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Update only the completed status
    const updateData: UpdateTodoInput = {
      id: createdTodo.id,
      completed: true
    };
    
    const result = await updateTodo(updateData);

    // Verify only completed was updated
    expect(result.title).toEqual(createdTodo.title);
    expect(result.description).toEqual(createdTodo.description);
    expect(result.completed).toEqual(true);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should update description to null', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Update description to null
    const updateData: UpdateTodoInput = {
      id: createdTodo.id,
      description: null
    };
    
    const result = await updateTodo(updateData);

    // Verify description was set to null
    expect(result.description).toBeNull();
    expect(result.title).toEqual(createdTodo.title);
    expect(result.completed).toEqual(createdTodo.completed);
  });

  it('should save updated todo to database', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Update the todo
    const updateData = {
      ...updateInput,
      id: createdTodo.id
    };
    
    const result = await updateTodo(updateData);

    // Query database to verify changes were persisted
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    const savedTodo = todos[0];
    expect(savedTodo.title).toEqual('Updated Todo');
    expect(savedTodo.description).toEqual('Updated description');
    expect(savedTodo.completed).toEqual(true);
    expect(savedTodo.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when todo does not exist', async () => {
    const updateData: UpdateTodoInput = {
      id: 999, // Non-existent ID
      title: 'This will fail'
    };

    await expect(updateTodo(updateData)).rejects.toThrow(/not found/i);
  });

  it('should always update the updated_at timestamp', async () => {
    // Create a todo first
    const createdTodo = await createTodoInDb(createInput);
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // Update with same values
    const updateData: UpdateTodoInput = {
      id: createdTodo.id,
      title: createdTodo.title // Same title
    };
    
    const result = await updateTodo(updateData);

    // Even with same values, updated_at should be newer
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });
});
