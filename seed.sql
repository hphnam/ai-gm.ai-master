-- ============================================================
-- GM AI - NeonDB Seed
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- SCHEMA
-- ============================================================

CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT,
  type        TEXT NOT NULL, -- 'bar', 'restaurant', 'pub', 'cafe'
  timezone    TEXT NOT NULL DEFAULT 'Europe/London',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  lead_time_days INT NOT NULL DEFAULT 2,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_categories (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  TEXT NOT NULL UNIQUE -- 'draught', 'spirits', 'wine', 'soft_drinks', 'food', 'cleaning', 'disposables'
);

CREATE TABLE stock_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id),
  category_id     UUID NOT NULL REFERENCES stock_categories(id),
  name            TEXT NOT NULL,
  sku             TEXT,
  unit            TEXT NOT NULL,          -- 'keg', 'bottle', 'case', 'kg', 'litre', 'unit'
  unit_size       TEXT,                   -- e.g. '11gal', '70cl', '24x330ml'
  current_qty     NUMERIC(10,2) NOT NULL DEFAULT 0,
  par_level       NUMERIC(10,2) NOT NULL, -- minimum stock level before reorder
  reorder_qty     NUMERIC(10,2) NOT NULL, -- how much to order when below par
  cost_per_unit   NUMERIC(10,2),
  avg_weekly_usage NUMERIC(10,2),         -- for AI reasoning
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'received', 'cancelled'
  ordered_at    TIMESTAMPTZ,
  expected_at   TIMESTAMPTZ,
  received_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  qty_ordered NUMERIC(10,2) NOT NULL,
  qty_received NUMERIC(10,2),
  unit_cost   NUMERIC(10,2)
);

CREATE TABLE sop_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE, -- NULL = global/all venues
  title       TEXT NOT NULL,
  category    TEXT NOT NULL, -- 'opening', 'closing', 'equipment', 'emergency', 'hr', 'health_safety'
  content     TEXT NOT NULL,
  tags        TEXT[],        -- ['ice_machine', 'bar', 'cellar'] etc
  version     INT NOT NULL DEFAULT 1,
  updated_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venue_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Venues
INSERT INTO venues (id, name, address, type) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'The Crown', '14 Market Street, Preston, PR1 2JA', 'pub'),
  ('a1000000-0000-0000-0000-000000000002', 'The Anchor Bar', '7 Dock Road, Liverpool, L3 4AX', 'bar');

-- Suppliers
INSERT INTO suppliers (id, name, contact_name, email, phone, lead_time_days, notes) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Matthew Clark', 'Dave Henshaw', 'dave.henshaw@matthewclark.co.uk', '01772 889900', 2, 'Main drinks distributor. Order by 5pm for next-day delivery.'),
  ('b1000000-0000-0000-0000-000000000002', 'Carlsberg UK', 'Sarah Booth', 'sarah.booth@carlsberg.co.uk', '01604 668866', 3, 'Direct lager supplier. Minimum order 4 kegs.'),
  ('b1000000-0000-0000-0000-000000000003', 'Brakes Bros', 'Ops Team', 'orders@brakesfoodservice.co.uk', '0345 606 9090', 1, 'Food and sundries. Order before 3pm for next day.'),
  ('b1000000-0000-0000-0000-000000000004', 'Diageo GB', 'Account Manager', 'gbaccounts@diageo.com', '0800 917 3036', 5, 'Spirits - Guinness, Smirnoff, Baileys, Johnnie Walker etc.'),
  ('b1000000-0000-0000-0000-000000000005', 'Coca-Cola European Partners', 'Account Team', 'orders.gb@cceep.com', '0800 227711', 3, 'Post-mix syrups, bottles, energy drinks.');

-- Stock Categories
INSERT INTO stock_categories (id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'draught'),
  ('c1000000-0000-0000-0000-000000000002', 'spirits'),
  ('c1000000-0000-0000-0000-000000000003', 'wine'),
  ('c1000000-0000-0000-0000-000000000004', 'soft_drinks'),
  ('c1000000-0000-0000-0000-000000000005', 'food'),
  ('c1000000-0000-0000-0000-000000000006', 'cleaning'),
  ('c1000000-0000-0000-0000-000000000007', 'disposables');

-- Stock Items - The Crown
INSERT INTO stock_items (venue_id, supplier_id, category_id, name, sku, unit, unit_size, current_qty, par_level, reorder_qty, cost_per_unit, avg_weekly_usage, notes) VALUES
  -- Draught
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Carlsberg Lager', 'CAR-11G', 'keg', '11gal', 3, 4, 4, 89.00, 5.5, 'Best seller. Check pressure daily.'),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'Guinness', 'GUI-11G', 'keg', '11gal', 2, 3, 3, 102.00, 3.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Doom Bar Amber Ale', 'DOO-9G', 'keg', '9gal', 1, 2, 2, 76.00, 2.0, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Neck Oil Session IPA', 'NEC-30L', 'keg', '30L', 0, 1, 2, 68.00, 1.5, 'Craft line - lower volume'),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Aspall Cider', 'ASP-11G', 'keg', '11gal', 2, 2, 2, 84.00, 1.8, NULL),

  -- Spirits
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Smirnoff Vodka', 'SMI-70CL', 'bottle', '70cl', 6, 6, 6, 14.50, 4.0, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Johnnie Walker Red Label', 'JWR-70CL', 'bottle', '70cl', 4, 4, 4, 17.20, 2.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Hendricks Gin', 'HEN-70CL', 'bottle', '70cl', 3, 4, 4, 22.00, 3.2, 'Gin & tonic popular Friday/Saturday'),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Bacardi Rum', 'BAC-70CL', 'bottle', '70cl', 2, 3, 3, 12.80, 1.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Baileys Irish Cream', 'BAI-70CL', 'bottle', '70cl', 5, 3, 3, 11.50, 1.2, 'Higher stock pre-Christmas'),

  -- Wine
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Pinot Grigio (House White)', 'PNG-75CL', 'bottle', '75cl', 12, 12, 12, 5.80, 8.0, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Merlot (House Red)', 'MER-75CL', 'bottle', '75cl', 8, 12, 12, 5.60, 6.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Prosecco', 'PRO-75CL', 'bottle', '75cl', 18, 12, 12, 7.20, 10.0, 'Busy weekends. Keep 6 in fridge.'),

  -- Soft Drinks
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'Coca-Cola Post-Mix', 'COK-BAG', 'unit', '10L bag', 4, 3, 3, 18.00, 2.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'Diet Coke Post-Mix', 'DCO-BAG', 'unit', '10L bag', 2, 2, 2, 18.00, 1.8, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'Red Bull', 'RBL-25CL', 'case', '24x250ml', 3, 2, 2, 21.00, 1.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'J2O Variety Pack', 'J2O-MIX', 'case', '24x275ml', 1, 2, 2, 14.40, 0.8, NULL),

  -- Food
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'Pork Scratchings', 'PSC-BOX', 'case', '24 bags', 5, 4, 4, 12.00, 2.0, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'Ready Salted Crisps', 'CRS-RS', 'case', '48 bags', 3, 4, 4, 9.60, 3.5, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'Nuts Mixed', 'NUT-MIX', 'case', '24 bags', 2, 3, 3, 10.80, 1.5, NULL),

  -- Cleaning
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000006', 'Line Cleaner', 'LCL-5L', 'unit', '5L', 2, 2, 2, 8.50, 0.5, 'Use every Monday for line clean'),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000006', 'Glass Wash Detergent', 'GWD-5L', 'unit', '5L', 1, 2, 2, 6.20, 1.0, NULL),

  -- Disposables
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', 'Paper Napkins', 'NAP-500', 'pack', '500', 8, 5, 5, 3.20, 2.0, NULL),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', 'Cocktail Straws', 'STR-250', 'pack', '250', 4, 4, 4, 1.80, 1.5, NULL);

-- Recent Purchase Orders - The Crown
WITH po1 AS (
  INSERT INTO purchase_orders (id, venue_id, supplier_id, status, ordered_at, expected_at, received_at, notes)
  VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'received',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    'Weekly lager order'
  )
  RETURNING id
),
po2 AS (
  INSERT INTO purchase_orders (id, venue_id, supplier_id, status, ordered_at, expected_at, notes)
  VALUES (
    'e1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'sent',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 day',
    'Spirits and wine restock'
  )
  RETURNING id
)
SELECT 1; -- CTEs need a SELECT

INSERT INTO purchase_order_items (po_id, stock_item_id, qty_ordered, qty_received, unit_cost)
SELECT
  'e1000000-0000-0000-0000-000000000001',
  id,
  4,
  4,
  89.00
FROM stock_items
WHERE name = 'Carlsberg Lager' AND venue_id = 'a1000000-0000-0000-0000-000000000001';

INSERT INTO purchase_order_items (po_id, stock_item_id, qty_ordered, unit_cost)
SELECT
  'e1000000-0000-0000-0000-000000000002',
  id,
  4,
  22.00
FROM stock_items
WHERE name = 'Hendricks Gin' AND venue_id = 'a1000000-0000-0000-0000-000000000001';

INSERT INTO purchase_order_items (po_id, stock_item_id, qty_ordered, unit_cost)
SELECT
  'e1000000-0000-0000-0000-000000000002',
  id,
  12,
  5.80
FROM stock_items
WHERE name = 'Pinot Grigio (House White)' AND venue_id = 'a1000000-0000-0000-0000-000000000001';

-- ============================================================
-- SOP DOCUMENTS
-- ============================================================

INSERT INTO sop_documents (venue_id, title, category, content, tags, updated_by) VALUES

-- Global SOPs (venue_id = NULL)
(NULL, 'Ice Machine - Troubleshooting Guide', 'equipment', 
'# Ice Machine Troubleshooting

## Make/Model: Scotsman EC 106 (fitted across all venues)

## Machine Not Making Ice

1. Check the power switch is ON (green light on front panel).
2. Check the water supply valve under the machine is fully open.
3. Check the water filter — if the red indicator light is on, the filter needs replacing (filters stored in dry store, top shelf).
4. Press and hold the RESET button for 5 seconds. Wait 30 minutes for a new ice cycle to begin.
5. If the machine shows error code E1: the water inlet is blocked. Turn off the machine and call the engineer.
6. If the machine shows error code E2: the ice full sensor is stuck. Open the lid and gently clear any ice bridging across the sensor with a wooden spoon. Do NOT use metal utensils.

## Machine Leaking Water

1. Check the drain hose at the rear is not kinked or blocked.
2. Check the door seal is seated properly.
3. If water is coming from underneath, turn off the machine immediately and call the engineer.

## Machine Making Cloudy/Poor Quality Ice

1. Run a full clean cycle: Press and hold the CLEAN button for 3 seconds. The machine will run a 30-minute clean cycle automatically.
2. Check water filter — replace if indicator is red.
3. If issue persists after clean cycle, log it on the maintenance sheet and notify the area manager.

## Engineer Contact

**Coolsure Refrigeration Services**
Phone: 01772 445566
Email: service@coolsure.co.uk
Available: Mon–Fri 8am–6pm. Out of hours: 07700 900123 (emergency only).

## Routine Maintenance

- Weekly: Wipe down exterior, check water level indicator.
- Monthly: Full clean cycle (log in maintenance book).
- Every 6 months: Filter replacement — engineer will contact to schedule.',
ARRAY['ice_machine', 'equipment', 'troubleshooting'], 'Head Office'),

(NULL, 'Cellar Management - Best Practice', 'equipment',
'# Cellar Management

## Temperature

The cellar should be maintained between 11°C and 13°C at all times. Check the thermometer daily and log in the cellar book.

If the temperature rises above 14°C:
1. Check the cellar cooler is switched on and the fan is running.
2. Check the door seal is intact and the door is fully closed.
3. If the cooler is running but temperature is still high, call the refrigeration engineer.

## Keg Changing

1. Turn off the gas supply at the cylinder before disconnecting any keg.
2. Release pressure on the coupler by lifting the pressure relief valve.
3. Twist the coupler anti-clockwise to disconnect. Fit the plastic dust cap to the empty keg.
4. Remove the dust cap from the new keg. Connect the coupler and press down firmly, then twist clockwise to lock.
5. Turn the gas back on. Check for leaks by listening for hissing and checking connections with soapy water.
6. Return to the bar and run the tap until the line is clear of any air or foam (typically 3–4 pints). Do not serve these — pour to waste.

## Line Cleaning

Lines must be cleaned every 7 days (Monday is line clean day).
1. Attach line cleaning kit to each tap.
2. Flush with cold water until clear.
3. Draw through line cleaner solution and leave for 20 minutes.
4. Flush with cold water until all traces of cleaner are gone (taste-test each line).
5. Reconnect kegs and purge air from lines.
6. Log the clean in the cellar book.',
ARRAY['cellar', 'equipment', 'kegs', 'beer'], 'Head Office'),

-- Venue-specific SOPs - The Crown
('a1000000-0000-0000-0000-000000000001', 'Opening Procedure - The Crown', 'opening',
'# Opening Procedure — The Crown

**Opening time: 11:00am Mon–Thu, 10:00am Fri–Sun**

## 45 Minutes Before Opening

- [ ] Deactivate alarm (code: see manager safe card)
- [ ] Check overnight voicemails and emails
- [ ] Turn on all lights (switches behind the bar and in the lounge)
- [ ] Check cellar temperature (log in cellar book — should be 11–13°C)
- [ ] Check CO2 and nitrogen levels on gas panel. Change cylinders if below 20 bar.
- [ ] Switch on glass washer and check detergent and rinse-aid levels
- [ ] Switch on ice machine
- [ ] Check bar float — should be £150. Report discrepancies to manager immediately.
- [ ] Stock the bar fridge (wine, mixers, soft drinks)
- [ ] Check toilets are clean and stocked (toilet roll, soap, paper towels)
- [ ] Unlock front door and turn CLOSED sign to OPEN',
ARRAY['opening', 'daily', 'bar'], 'The Crown Manager'),

('a1000000-0000-0000-0000-000000000001', 'Closing Procedure - The Crown', 'closing',
'# Closing Procedure — The Crown

**Last orders bell: 30 mins before close. Closing time: 11:00pm Mon–Thu, 12:00am Fri–Sat, 10:30pm Sun.**

## Last Orders

- Ring the bell 30 minutes before close and announce last orders.
- Ring the bell again at close and announce "Time please, ladies and gentlemen."
- Allow 20 minutes drinking-up time after close. Do not serve any further drinks.

## Bar Close-Down

- [ ] Cash up the till. Count float (£150), then count takings. Place takings in the safe using the drop box. Complete the till sheet.
- [ ] Switch off all draught taps at the bar
- [ ] Cover optics and spirit bottles
- [ ] Empty and clean the glasswasher. Leave the door open overnight.
- [ ] Wipe down all bar surfaces with sanitiser spray
- [ ] Empty ice bin — do NOT leave ice overnight (hygiene requirement)
- [ ] Switch off ice machine
- [ ] Check all tables cleared and glasses returned
- [ ] Check all windows closed and locked
- [ ] Check gents and ladies toilets — ensure no one remains, lights off
- [ ] Turn off all lights except the emergency exit lights
- [ ] Set alarm (see manager safe card for code)
- [ ] Lock and double-check front door

## Cellar

- [ ] Check all taps are off
- [ ] Check cellar temperature (log in cellar book)
- [ ] Ensure cellar door is locked

## Before You Leave

If you are the last person on site, text the area manager to confirm close: **Luke Barlow — 07700 900456**',
ARRAY['closing', 'daily', 'bar', 'till', 'alarm'], 'The Crown Manager'),

('a1000000-0000-0000-0000-000000000001', 'Fire Emergency Procedure - The Crown', 'emergency',
'# Fire Emergency Procedure — The Crown

## On Discovery of Fire or Smoke

1. **Raise the alarm immediately** — break the nearest glass call point (red box on wall).
2. **Do not attempt to fight the fire** unless it is very small and you are trained to use an extinguisher.
3. **Evacuate all customers and staff** via the nearest available exit:
   - Main exit: Front door onto Market Street
   - Secondary exit: Fire door at rear of kitchen (leads to car park)
4. **Do not use the lift.**
5. **Call 999** once you are outside and safe.
6. **Assemble at the muster point**: Car park on Cotton Court (across the road).
7. Do a headcount of all staff. Designate one person to inform fire brigade of the building layout.
8. **Do not re-enter the building** for any reason until the fire brigade gives the all clear.

## Key Contacts

- Fire brigade: 999
- Area manager: Luke Barlow — 07700 900456
- Building owner / landlord: Preston Properties Ltd — 01772 663344

## Extinguisher Locations

- Behind the bar (CO2 — for electrical fires)
- In the cellar (foam — for general fires)
- In the kitchen (wet chemical — for cooking fires)

Fire extinguisher inspection is due every 12 months. Last inspection: January 2025.',
ARRAY['emergency', 'fire', 'evacuation', 'safety'], 'Head Office'),

('a1000000-0000-0000-0000-000000000001', 'Weekly Ordering Guide - The Crown', 'operations',
'# Weekly Ordering Guide — The Crown

**Orders should be placed by Wednesday 5pm for Friday/weekend delivery.**

## Who to Order From

| Category        | Supplier          | Contact / Method                          |
|-----------------|-------------------|-------------------------------------------|
| Draught lager   | Carlsberg UK      | Online portal: carlsberg-trade.co.uk      |
| All other draught | Matthew Clark   | Rep: Dave Henshaw 01772 889900            |
| Spirits/liqueurs | Matthew Clark   | Same as above                             |
| Wine            | Matthew Clark     | Same as above                             |
| Food/crisps/nuts | Brakes Bros     | Online: brakesfoodservice.co.uk           |
| Soft drinks     | Coca-Cola EP      | Freephone: 0800 227711                    |
| Cleaning products | Brakes Bros    | Same as food                              |

## Ordering Process

1. Do a full stock count (cellar, back bar, dry store).
2. Compare current levels against par levels in the stock sheet (pinned in office).
3. Add items below par to the order, using the reorder quantity as a guide.
4. Log all orders in the order book with date and expected delivery.
5. Check deliveries against the order when they arrive. Report shortages or damage to the supplier within 24 hours.

## Notes

- Carlsberg have a minimum order of 4 kegs. Coordinate with The Anchor if needed to combine orders.
- Matthew Clark offer a free delivery on orders over £500. Try to consolidate.',
ARRAY['ordering', 'stock', 'suppliers', 'weekly'], 'The Crown Manager');

-- Venue Contacts - The Crown
INSERT INTO venue_contacts (venue_id, name, role, phone, email, is_emergency_contact, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Luke Barlow', 'Area Manager', '07700 900456', 'luke.barlow@thecrowngroup.co.uk', TRUE, 'Contact for major incidents, close-down confirmation, and operational issues.'),
  ('a1000000-0000-0000-0000-000000000001', 'Sarah Mitchell', 'Head Bartender', '07700 900789', NULL, FALSE, 'Key holder. First contact for shift issues.'),
  ('a1000000-0000-0000-0000-000000000001', 'Coolsure Refrigeration', 'Equipment Engineer', '01772 445566', 'service@coolsure.co.uk', FALSE, 'Ice machine, cellar cooler, glass fridges. Out of hours: 07700 900123'),
  ('a1000000-0000-0000-0000-000000000001', 'Preston Properties Ltd', 'Landlord', '01772 663344', NULL, TRUE, 'Building owner — contact for structural issues, floods, power failure.');

-- ============================================================
-- USEFUL VIEWS FOR AI CONTEXT QUERIES
-- ============================================================

-- Stock items below par level (for reorder recommendations)
CREATE VIEW v_stock_below_par AS
SELECT
  v.name AS venue_name,
  sc.name AS category,
  si.name AS item_name,
  si.current_qty,
  si.par_level,
  si.reorder_qty,
  si.unit,
  si.unit_size,
  si.avg_weekly_usage,
  s.name AS supplier_name,
  s.lead_time_days,
  ROUND((si.par_level - si.current_qty)::numeric, 2) AS qty_deficit,
  ROUND((si.current_qty / NULLIF(si.avg_weekly_usage, 0))::numeric, 1) AS weeks_of_stock_remaining
FROM stock_items si
JOIN venues v ON v.id = si.venue_id
JOIN stock_categories sc ON sc.id = si.category_id
LEFT JOIN suppliers s ON s.id = si.supplier_id
WHERE si.current_qty < si.par_level
ORDER BY v.name, sc.name, si.name;

-- Full stock snapshot for a venue
CREATE VIEW v_stock_snapshot AS
SELECT
  v.name AS venue_name,
  sc.name AS category,
  si.name AS item_name,
  si.sku,
  si.current_qty,
  si.par_level,
  si.reorder_qty,
  si.unit,
  si.unit_size,
  si.avg_weekly_usage,
  ROUND((si.current_qty / NULLIF(si.avg_weekly_usage, 0))::numeric, 1) AS weeks_of_stock_remaining,
  CASE
    WHEN si.current_qty = 0 THEN 'OUT_OF_STOCK'
    WHEN si.current_qty < si.par_level THEN 'BELOW_PAR'
    WHEN si.current_qty >= si.par_level * 1.5 THEN 'OVERSTOCKED'
    ELSE 'OK'
  END AS stock_status,
  s.name AS supplier_name,
  si.notes
FROM stock_items si
JOIN venues v ON v.id = si.venue_id
JOIN stock_categories sc ON sc.id = si.category_id
LEFT JOIN suppliers s ON s.id = si.supplier_id
ORDER BY v.name, sc.name, si.name;
