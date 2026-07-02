import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@prisma/client";

// Mock the prisma module before importing the service
vi.mock("../../lib/prisma.js", () => {
  return {
    default: {
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import prisma from "../../lib/prisma.js";
import * as taskService from "../../services/task.service.js";

const mockPrisma = vi.mocked(prisma);

const mockTask: Task = {
  id: 1,
  title: "Test Task",
  description: "A test task description",
  completed: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("TaskService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all tasks ordered by createdAt desc", async () => {
      const tasks = [mockTask];
      (mockPrisma.task.findMany as any).mockResolvedValue(tasks);

      const result = await taskService.findAll();

      expect(result).toEqual(tasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return an empty array when no tasks exist", async () => {
      (mockPrisma.task.findMany as any).mockResolvedValue([]);

      const result = await taskService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return a task by id", async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);

      const result = await taskService.findById(1);

      expect(result).toEqual(mockTask);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return null when task not found", async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      const result = await taskService.findById(999);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a task with title and description", async () => {
      const newTask = { ...mockTask, id: 2, title: "New Task" };
      (mockPrisma.task.create as any).mockResolvedValue(newTask);

      const result = await taskService.create({
        title: "New Task",
        description: "New description",
      });

      expect(result).toEqual(newTask);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: "New Task",
          description: "New description",
        },
      });
    });

    it("should create a task with only title", async () => {
      const newTask = { ...mockTask, id: 3, description: null };
      (mockPrisma.task.create as any).mockResolvedValue(newTask);

      const result = await taskService.create({
        title: "Task without description",
      });

      expect(result).toEqual(newTask);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: "Task without description",
          description: undefined,
        },
      });
    });
  });

  describe("update", () => {
    it("should update an existing task", async () => {
      const updatedTask = {
        ...mockTask,
        title: "Updated Title",
        completed: true,
      };
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
      (mockPrisma.task.update as any).mockResolvedValue(updatedTask);

      const result = await taskService.update(1, {
        title: "Updated Title",
        completed: true,
      });

      expect(result).toEqual(updatedTask);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: "Updated Title", completed: true },
      });
    });

    it("should throw error when task not found", async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      await expect(
        taskService.update(999, { title: "New Title" }),
      ).rejects.toThrow("Task not found");
    });

    it("should update only the description", async () => {
      const updatedTask = { ...mockTask, description: "Updated description" };
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
      (mockPrisma.task.update as any).mockResolvedValue(updatedTask);

      const result = await taskService.update(1, {
        description: "Updated description",
      });

      expect(result).toEqual(updatedTask);
    });
  });

  describe("remove", () => {
    it("should delete an existing task", async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
      (mockPrisma.task.delete as any).mockResolvedValue(mockTask);

      const result = await taskService.remove(1);

      expect(result).toEqual(mockTask);
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should throw error when task to delete not found", async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      await expect(taskService.remove(999)).rejects.toThrow("Task not found");
    });
  });
});
