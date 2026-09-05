import { Router } from 'express';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';
import * as catalogController from '../controllers/catalog.controller.js';

const router = Router();

// Apply global middleware to all routes in this router
router.use(authenticate);
router.use(resolveOrgContext);

// --- Products CRUD ---
const productRoles = requireRoles(['admin', 'sales_manager', 'sales_rep']);

router.post('/', productRoles, catalogController.createProduct);
router.get('/', productRoles, catalogController.listProducts);
router.get('/:productId', productRoles, catalogController.getProduct);
router.put('/:productId', productRoles, catalogController.updateProduct);
router.delete('/:productId', productRoles, catalogController.deleteProduct);

// --- Product Variants CRUD ---
router.post('/:productId/variants', productRoles, catalogController.createVariant);
router.get('/:productId/variants', productRoles, catalogController.listVariants);
router.put('/:productId/variants/:variantId', productRoles, catalogController.updateVariant);
router.delete('/:productId/variants/:variantId', productRoles, catalogController.deleteVariant);

// --- Price Lists CRUD ---
const priceListRoles = requireRoles(['admin', 'sales_manager']);

router.post('/price-lists', priceListRoles, catalogController.createPriceList);
router.get('/price-lists', priceListRoles, catalogController.listPriceLists);
router.get('/price-lists/:priceListId', priceListRoles, catalogController.getPriceList);
router.put('/price-lists/:priceListId', priceListRoles, catalogController.updatePriceList);

// --- Price List Items CRUD ---
router.post('/price-lists/:priceListId/items', priceListRoles, catalogController.addPriceListItem);
router.put('/price-lists/:priceListId/items/:itemId', priceListRoles, catalogController.updatePriceListItem);
router.delete('/price-lists/:priceListId/items/:itemId', priceListRoles, catalogController.removePriceListItem);

// --- Dynamic Price Resolver ---
router.post('/resolve-price', productRoles, catalogController.resolvePrice);

export default router;
