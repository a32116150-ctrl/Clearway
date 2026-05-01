const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all projects for the user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      include: { 
        expenses: true, 
        contractors: { include: { expenses: true } } 
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, budget, location, startDate } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        budget: parseFloat(budget),
        location,
        startDate: startDate ? new Date(startDate) : null,
        userId: req.user.id
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        expenses: true, 
        contractors: { 
          include: { 
            expenses: true,
            documents: true 
          } 
        }, 
        documents: true 
      }
    });
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await prisma.project.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add expense
router.post('/:id/expenses', auth, async (req, res) => {
  try {
    const { amount, category, note, date, contractorId } = req.body;
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        note,
        date: new Date(date),
        projectId: parseInt(req.params.id),
        contractorId: contractorId ? parseInt(contractorId) : null
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
router.delete('/:id/expenses/:expenseId', auth, async (req, res) => {
  try {
    await prisma.expense.delete({
      where: { id: parseInt(req.params.expenseId) }
    });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add contractor
router.post('/:id/contractors', auth, async (req, res) => {
  try {
    const { name, specialty, phone, teamSize, totalBudget, advancePaid, suppliesDetails } = req.body;
    const contractor = await prisma.contractor.create({
      data: {
        name,
        specialty,
        phone,
        teamSize: parseInt(teamSize) || 1,
        totalBudget: parseFloat(totalBudget) || 0,
        advancePaid: parseFloat(advancePaid) || 0,
        suppliesDetails,
        projectId: parseInt(req.params.id)
      }
    });
    res.json(contractor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update contractor
router.put('/:id/contractors/:contractorId', auth, async (req, res) => {
  try {
    const { name, specialty, phone, teamSize, totalBudget, advancePaid, suppliesDetails } = req.body;
    const contractor = await prisma.contractor.update({
      where: { id: parseInt(req.params.contractorId) },
      data: {
        name,
        specialty,
        phone,
        teamSize: parseInt(teamSize) || 1,
        totalBudget: parseFloat(totalBudget) || 0,
        advancePaid: parseFloat(advancePaid) || 0,
        suppliesDetails
      }
    });
    res.json(contractor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contractor
router.delete('/:id/contractors/:contractorId', auth, async (req, res) => {
  try {
    await prisma.contractor.delete({
      where: { id: parseInt(req.params.contractorId) }
    });
    res.json({ message: 'Contractor deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
