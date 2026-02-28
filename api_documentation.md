# Documentación de APIs - Project Barfer

Este documento contiene una lista exhaustiva de todos los endpoints de API disponibles en el proyecto, organizados por módulos.

---

## 1. Órdenes (`/orders`)
**Controlador:** `OrdersController`

- **Crear Orden**
  - **Ruta:** `POST /orders`
  - **Descripción:** Crea una nueva orden en el sistema.
  - **Parámetros:** `OrderDto` (Body).
  - **Autenticación:** Requerida (Rol: User).
  - **Devuelve:** La orden creada.

- **Actualizar Orden**
  - **Ruta:** `PATCH /orders/:id`
  - **Descripción:** Actualiza una orden existente.
  - **Parámetros:** `id` (Param), `UpdateOrderDto` (Body).
  - **Autenticación:** Requerida (Rol: User).
  - **Devuelve:** La orden actualizada.

- **Obtener Todas las Órdenes**
  - **Ruta:** `GET /orders/all`
  - **Descripción:** Obtiene una lista paginada y filtrada de todas las órdenes.
  - **Parámetros:** `GetAllOrdersParamsDto` (Query).
  - **Autenticación:** Requerida (Rol: User).
  - **Devuelve:** Lista de órdenes.

- **Eliminar Orden**
  - **Ruta:** `DELETE /orders/:id`
  - **Descripción:** Elimina una orden por su ID.
  - **Parámetros:** `id` (Param).
  - **Autenticación:** Requerida (Rol: User).
  - **Devuelve:** Resultado de la eliminación.

---

## 2. Productos (`/products`)
**Controlador:** `ProductsController`

- **Crear Producto**
  - **Ruta:** `POST /products/new`
  - **Descripción:** Crea un nuevo producto.
  - **Parámetros:** `ProductDto` (Body).
  - **Autenticación:** Requerida (Rol: Admin).
  - **Devuelve:** El producto creado.

- **Obtener Todos los Productos**
  - **Ruta:** `GET /products`
  - **Descripción:** Retorna todos los productos.
  - **Devuelve:** Lista de productos.

- **Obtener por Tipo**
  - **Ruta:** `GET /products/by-type/:type`
  - **Descripción:** Retorna productos de un tipo específico.
  - **Parámetros:** `type` (Param).
  - **Devuelve:** Lista de productos.

- **Obtener por ID**
  - **Ruta:** `GET /products/:id`
  - **Descripción:** Retorna un producto por su ID.
  - **Parámetros:** `id` (Param).
  - **Devuelve:** El producto solicitado.

- **Actualizar Producto**
  - **Ruta:** `PATCH /products/byId/:id`
  - **Descripción:** Actualiza un producto por su ID.
  - **Parámetros:** `id` (Param), `ProductDto` (Body).
  - **Autenticación:** Requerida (Rol: Admin).
  - **Devuelve:** El producto actualizado.

- **Eliminar Producto**
  - **Ruta:** `DELETE /products/byId/:id`
  - **Descripción:** Elimina un producto por su ID.
  - **Parámetros:** `id` (Param).
  - **Autenticación:** Requerida (Rol: Admin).
  - **Devuelve:** Resultado de la eliminación.

- **Obtener por Categoría**
  - **Ruta:** `GET /products/by-category/:id`
  - **Descripción:** Retorna productos de una categoría específica.
  - **Parámetros:** `id` (Param), `product-type` (Query, opcional).
  - **Devuelve:** Lista de productos.

- **Ordenar por Precio**
  - **Ruta:** `GET /products/sort/by-price`
  - **Descripción:** Retorna productos ordenados por precio.
  - **Devuelve:** Lista ordenada.

- **Más Vendidos**
  - **Ruta:** `GET /products/sold/most-sold`
  - **Descripción:** Retorna los productos más vendidos.
  - **Devuelve:** Lista de productos.

- **Feed de Google Merchant**
  - **Ruta:** `GET /products/feed/google-merchant`
  - **Descripción:** Genera el feed para Google Merchant.
  - **Devuelve:** Datos del feed.

---

## 3. Stock (`/stock`)
**Controlador:** `StockController`

- **Crear Stock**
  - **Ruta:** `POST /stock`
  - **Descripción:** Crea un nuevo registro de stock.
  - **Parámetros:** `CreateStockDto` (Body).
  - **Devuelve:** El registro creado.

- **Calcular Ventas**
  - **Ruta:** `POST /stock/calculate-sales`
  - **Descripción:** Calcula ventas a partir de órdenes.
  - **Parámetros:** `CalculateSalesDto` (Body).
  - **Devuelve:** Totales calculados.

- **Obtener por Punto de Envío**
  - **Ruta:** `GET /stock/punto-envio/:puntoEnvioId`
  - **Descripción:** Retorna el stock de un punto de envío.
  - **Parámetros:** `puntoEnvioId` (Param).
  - **Devuelve:** Lista de stock.

- **Obtener por ID**
  - **Ruta:** `GET /stock/:id`
  - **Descripción:** Retorna un registro de stock por ID.
  - **Parámetros:** `id` (Param).
  - **Devuelve:** Registro de stock.

- **Actualizar Stock**
  - **Ruta:** `PATCH /stock/:id`
  - **Descripción:** Actualiza parcialmente un registro de stock.
  - **Parámetros:** `id` (Param), `UpdateStockDto` (Body).
  - **Devuelve:** Registro actualizado.

- **Eliminar Stock**
  - **Ruta:** `DELETE /stock/:id`
  - **Descripción:** Elimina un registro de stock.
  - **Parámetros:** `id` (Param).
  - **Devuelve:** Resultado.

---

## 4. Repartos (`/repartos`)
**Controlador:** `RepartosController`

- **Obtener Datos de Repartos**
  - **Ruta:** `GET /repartos`
  - **Descripción:** Retorna todos los datos de repartos.
  - **Devuelve:** Datos de repartos.

- **Obtener Estadísticas**
  - **Ruta:** `GET /repartos/stats`
  - **Descripción:** Retorna estadísticas de repartos.
  - **Devuelve:** Estadísticas.

- **Obtener por Semana**
  - **Ruta:** `GET /repartos/:weekKey`
  - **Descripción:** Retorna repartos de una semana específica.
  - **Parámetros:** `weekKey` (Param).
  - **Devuelve:** Datos de la semana.

- **Inicializar Semana**
  - **Ruta:** `POST /repartos/initialize/:weekKey`
  - **Descripción:** Inicializa los datos para una nueva semana.
  - **Parámetros:** `weekKey` (Param).
  - **Devuelve:** Booleano de éxito.

- **Guardar Semana**
  - **Ruta:** `POST /repartos/:weekKey`
  - **Descripción:** Guarda/Actualiza los repartos de una semana.
  - **Parámetros:** `weekKey` (Param), `CreateRepartoDto` (Body).
  - **Devuelve:** Booleano de éxito.

- **Actualizar Entrada de Reparto**
  - **Ruta:** `PUT /repartos/:weekKey/:dayKey/:rowIndex`
  - **Descripción:** Actualiza una fila específica de un día.
  - **Parámetros:** `weekKey`, `dayKey`, `rowIndex` (Params), `UpdateRepartoEntryDto` (Body).
  - **Devuelve:** Booleano de éxito.

- **Alternar Completado**
  - **Ruta:** `PATCH /repartos/toggle/:weekKey/:dayKey/:rowIndex`
  - **Descripción:** Alterna el estado de completado de un reparto.
  - **Parámetros:** `weekKey`, `dayKey`, `rowIndex` (Params).
  - **Devuelve:** Booleano de éxito.

- **Agregar Fila a Día**
  - **Ruta:** `POST /repartos/add-row/:weekKey/:dayKey`
  - **Descripción:** Agrega una nueva fila a un día específico.
  - **Parámetros:** `weekKey`, `dayKey` (Params).
  - **Devuelve:** Booleano de éxito.

- **Eliminar Fila de Día**
  - **Ruta:** `DELETE /repartos/remove-row/:weekKey/:dayKey/:rowIndex`
  - **Descripción:** Elimina una fila de un día.
  - **Parámetros:** `weekKey`, `dayKey`, `rowIndex` (Params).
  - **Devuelve:** Booleano de éxito.

- **Eliminar Semana Completamente**
  - **Ruta:** `DELETE /repartos/:weekKey`
  - **Descripción:** Elimina todos los repartos de una semana.
  - **Parámetros:** `weekKey` (Param).
  - **Devuelve:** Booleano de éxito.

---

## 5. Mayoristas (`/mayoristas`)
**Controlador:** `MayoristasController`

- **Crear Mayorista**
  - **Ruta:** `POST /mayoristas`
  - **Descripción:** Registro de un nuevo mayorista.
  - **Parámetros:** `CreateMayoristaDto` (Body).
  - **Devuelve:** Mayorista creado.

- **Obtener Todos**
  - **Ruta:** `GET /mayoristas`
  - **Descripción:** Retorna todos los mayoristas.
  - **Devuelve:** Lista de mayoristas.

- **Buscar Mayoristas**
  - **Ruta:** `GET /mayoristas/search`
  - **Descripción:** Busca mayoristas por término.
  - **Parámetros:** `q` (Query).
  - **Devuelve:** Resultados de búsqueda.

- **Buscar por Nombre y Apellido**
  - **Ruta:** `GET /mayoristas/find-by-name`
  - **Descripción:** Busca un mayorista exacto por nombre y apellido.
  - **Parámetros:** `name`, `lastName` (Query).
  - **Devuelve:** Mayorista encontrado.

- **Obtener por ID**
  - **Ruta:** `GET /mayoristas/:id`
  - **Descripción:** Retorna un mayorista por ID.
  - **Parámetros:** `id` (Param).
  - **Devuelve:** Mayorista.

- **Actualizar Mayorista**
  - **Ruta:** `PATCH /mayoristas/:id`
  - **Descripción:** Actualiza datos de un mayorista.
  - **Parámetros:** `id` (Param), `UpdateMayoristaDto` (Body).
  - **Devuelve:** Mayorista actualizado.

- **Eliminar Mayorista**
  - **Ruta:** `DELETE /mayoristas/:id`
  - **Descripción:** Elimina un registro de mayorista.
  - **Parámetros:** `id` (Param).
  - **Devuelve:** Resultado.

---

## 6. Direcciones (`/address`)
**Controlador:** `AddressController`

- **Crear Dirección**
  - **Ruta:** `POST /address`
  - **Parámetros:** `AddressDto` (Body).
  - **Autenticación:** User.

- **Actualizar Dirección**
  - **Ruta:** `PUT /address/:id`
  - **Parámetros:** `id` (Param), `AddressDto` (Body).
  - **Autenticación:** User.

- **Obtener por Usuario**
  - **Ruta:** `GET /address/user/:id`
  - **Parámetros:** `id` (Param).
  - **Autenticación:** User.

---

## 7. Autenticación (`/auth`)
**Controlador:** `AuthController`

- **Registro**
  - **Ruta:** `POST /auth/register`
- **Login**
  - **Ruta:** `POST /auth/login`
- **Logout**
  - **Ruta:** `POST /auth/logout`
- **Cambiar Password**
  - **Ruta:** `POST /auth/change-password`

---

## 8. Precios (`/prices`)
**Controlador:** `PricesController`

- **Obtener Actuales**
  - **Ruta:** `GET /prices/current`
- **Historial**
  - **Ruta:** `GET /prices/history`
  - **Query:** `section`, `product`, `weight`, `priceType`.
- **Estadísticas**
  - **Ruta:** `GET /prices/stats`
  - **Autenticación:** Admin.

---

## 9. Salidas/Gastos (`/salidas`)
**Controlador:** `SalidasController`

- **Crear Salida**
  - **Ruta:** `POST /salidas`
- **Obtener Paginado**
  - **Ruta:** `GET /salidas/paginated`
  - **Query:** Varios filtros (fecha, categoria, marca, etc).
- **Estadísticas por Mes**
  - **Ruta:** `GET /salidas/stats`
  - **Query:** `year`, `month`.

---

*(Nota: Esta es una versión simplificada para agrupar los endpoints más relevantes. Para ver el detalle técnico completo, referirse a los archivos `.controller.ts` respectivos.)*
