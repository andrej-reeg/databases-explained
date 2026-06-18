// Seed schema + data for the Stage 1 store. Matches the rows shown in the
// stage overview so worked examples line up with what the runner returns.
export const SEED_SQL = `
CREATE TABLE customers (
  id      INTEGER PRIMARY KEY,
  name    TEXT,
  country TEXT
);
INSERT INTO customers VALUES
  (1, 'Ana',  'IE'),
  (2, 'Ben',  'IE'),
  (3, 'Cleo', 'LT'),
  (4, 'Dee',  'LT'),
  (5, 'Eve',  NULL),   -- no country recorded (for IS NULL examples)
  (6, 'Finn', 'IE');

CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT,
  price REAL
);
INSERT INTO products VALUES
  (1, 'Running shoe', 40.00),
  (2, 'Trail socks',  12.50),
  (3, 'Water bottle',  8.00),
  (4, 'Sun cap',       15.00);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER,
  created_at  TEXT,
  total       REAL
);
INSERT INTO orders VALUES
  (101, 1, '2026-01-05', 40.00),
  (102, 1, '2026-02-11', 25.00),
  (103, 2, '2026-02-20', 90.00),
  (104, 4, '2026-03-02', 25.00),   -- Dee: a small spender (under 30)
  (105, 6, '2026-03-20', 90.00);   -- Finn: ties Ben's total of 90
  -- Cleo (3) and Eve (5) have no orders

CREATE TABLE order_items (
  order_id   INTEGER,
  product_id INTEGER,
  quantity   INTEGER
);
INSERT INTO order_items VALUES
  (101, 1, 1),
  (102, 2, 2),
  (103, 1, 1),
  (103, 3, 1),
  (104, 4, 1),
  (105, 1, 1),
  (105, 2, 1);
`;

export const DEFAULT_QUERY = 'SELECT * FROM customers;';
