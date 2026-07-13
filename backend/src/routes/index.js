const express = require("express");
const clientiRoutes = require("./clientiRoutes");
const attivitaRoutes = require("./attivitaRoutes");
const attivitaController = require("../controllers/attivitaController");
const { catchErrors } = require("../middleware/errorHandler");

const router = express.Router();

router.use("/clienti", clientiRoutes);
router.use("/attivita", attivitaRoutes);
router.get("/stats", catchErrors(attivitaController.statistiche));

module.exports = router;
