const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/:projectId', auth, upload.single('file'), async (req, res) => {
  try {
    const { name, contractorId } = req.body;
    const document = await prisma.document.create({
      data: {
        name: name || req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        projectId: parseInt(req.params.projectId),
        contractorId: contractorId ? parseInt(contractorId) : null
      }
    });
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const filePath = path.join(__dirname, '..', doc.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.document.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
