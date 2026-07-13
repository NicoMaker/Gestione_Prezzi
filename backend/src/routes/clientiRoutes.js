const express = require("express");
const clientiController = require("../controllers/clientiController");
const { catchErrors } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", catchErrors(clientiController.lista));
router.post("/", catchErrors(clientiController.crea));
router.put("/:id", catchErrors(clientiController.aggiorna));
router.delete("/:id", catchErrors(clientiController.elimina));

module.exports = router;
