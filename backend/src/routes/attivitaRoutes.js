const express = require("express");
const attivitaController = require("../controllers/attivitaController");
const { catchErrors } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", catchErrors(attivitaController.lista));
router.get("/:id", catchErrors(attivitaController.dettaglio));
router.post("/", catchErrors(attivitaController.crea));
router.put("/:id", catchErrors(attivitaController.aggiorna));
router.patch("/:id/pagato", catchErrors(attivitaController.togglePagato));
router.delete("/:id", catchErrors(attivitaController.elimina));

module.exports = router;
