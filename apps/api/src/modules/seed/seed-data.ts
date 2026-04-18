export const VENUE_CROWN = 'a1000000-0000-0000-0000-000000000001'
export const VENUE_ANCHOR = 'a1000000-0000-0000-0000-000000000002'

export const SUPPLIER_MATTHEW_CLARK = 'b1000000-0000-0000-0000-000000000001'
export const SUPPLIER_CARLSBERG = 'b1000000-0000-0000-0000-000000000002'
export const SUPPLIER_BRAKES = 'b1000000-0000-0000-0000-000000000003'
export const SUPPLIER_DIAGEO = 'b1000000-0000-0000-0000-000000000004'
export const SUPPLIER_COCA_COLA = 'b1000000-0000-0000-0000-000000000005'

export const CAT_DRAUGHT = 'c1000000-0000-0000-0000-000000000001'
export const CAT_SPIRITS = 'c1000000-0000-0000-0000-000000000002'
export const CAT_WINE = 'c1000000-0000-0000-0000-000000000003'
export const CAT_SOFT_DRINKS = 'c1000000-0000-0000-0000-000000000004'
export const CAT_FOOD = 'c1000000-0000-0000-0000-000000000005'
export const CAT_CLEANING = 'c1000000-0000-0000-0000-000000000006'
export const CAT_DISPOSABLES = 'c1000000-0000-0000-0000-000000000007'

export const venues = [
  { id: VENUE_CROWN, name: 'The Crown', address: '14 Market Street, Preston, PR1 2JA', type: 'pub' },
  { id: VENUE_ANCHOR, name: 'The Anchor Bar', address: '7 Dock Road, Liverpool, L3 4AX', type: 'bar' },
] as const

export const mockSupplierSeeds = [
  {
    id: SUPPLIER_MATTHEW_CLARK,
    name: 'Matthew Clark',
    contactName: 'Dave Henshaw',
    email: 'dave.henshaw@matthewclark.co.uk',
    phone: '01772 889900',
    leadTimeDays: 2,
    notes: 'Main drinks distributor. Order by 5pm for next-day delivery.',
  },
  {
    id: SUPPLIER_CARLSBERG,
    name: 'Carlsberg UK',
    contactName: 'Sarah Booth',
    email: 'sarah.booth@carlsberg.co.uk',
    phone: '01604 668866',
    leadTimeDays: 3,
    notes: 'Direct lager supplier. Minimum order 4 kegs.',
  },
  {
    id: SUPPLIER_BRAKES,
    name: 'Brakes Bros',
    contactName: 'Ops Team',
    email: 'orders@brakesfoodservice.co.uk',
    phone: '0345 606 9090',
    leadTimeDays: 1,
    notes: 'Food and sundries. Order before 3pm for next day.',
  },
  {
    id: SUPPLIER_DIAGEO,
    name: 'Diageo GB',
    contactName: 'Account Manager',
    email: 'gbaccounts@diageo.com',
    phone: '0800 917 3036',
    leadTimeDays: 5,
    notes: 'Spirits - Guinness, Smirnoff, Baileys, Johnnie Walker etc.',
  },
  {
    id: SUPPLIER_COCA_COLA,
    name: 'Coca-Cola European Partners',
    contactName: 'Account Team',
    email: 'orders.gb@cceep.com',
    phone: '0800 227711',
    leadTimeDays: 3,
    notes: 'Post-mix syrups, bottles, energy drinks.',
  },
] as const

export const mockStockCategorySeeds = [
  { id: CAT_DRAUGHT, name: 'draught' },
  { id: CAT_SPIRITS, name: 'spirits' },
  { id: CAT_WINE, name: 'wine' },
  { id: CAT_SOFT_DRINKS, name: 'soft_drinks' },
  { id: CAT_FOOD, name: 'food' },
  { id: CAT_CLEANING, name: 'cleaning' },
  { id: CAT_DISPOSABLES, name: 'disposables' },
] as const

export type MockStockSeed = {
  id: string
  venueId: string
  supplierId: string | null
  categoryId: string
  name: string
  sku: string | null
  unit: string
  unitSize: string | null
  currentQty: number
  parLevel: number
  reorderQty: number
  costPerUnit: number | null
  avgWeeklyUsage: number | null
  notes: string | null
}

const s = (i: number) => `d0000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`

export const mockStockSeeds: ReadonlyArray<MockStockSeed> = [
  // Draught
  { id: s(1), venueId: VENUE_CROWN, supplierId: SUPPLIER_CARLSBERG, categoryId: CAT_DRAUGHT, name: 'Carlsberg Lager', sku: 'CAR-11G', unit: 'keg', unitSize: '11gal', currentQty: 3, parLevel: 4, reorderQty: 4, costPerUnit: 89.0, avgWeeklyUsage: 5.5, notes: 'Best seller. Check pressure daily.' },
  { id: s(2), venueId: VENUE_CROWN, supplierId: SUPPLIER_DIAGEO, categoryId: CAT_DRAUGHT, name: 'Guinness', sku: 'GUI-11G', unit: 'keg', unitSize: '11gal', currentQty: 2, parLevel: 3, reorderQty: 3, costPerUnit: 102.0, avgWeeklyUsage: 3.5, notes: null },
  { id: s(3), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_DRAUGHT, name: 'Doom Bar Amber Ale', sku: 'DOO-9G', unit: 'keg', unitSize: '9gal', currentQty: 1, parLevel: 2, reorderQty: 2, costPerUnit: 76.0, avgWeeklyUsage: 2.0, notes: null },
  { id: s(4), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_DRAUGHT, name: 'Neck Oil Session IPA', sku: 'NEC-30L', unit: 'keg', unitSize: '30L', currentQty: 0, parLevel: 1, reorderQty: 2, costPerUnit: 68.0, avgWeeklyUsage: 1.5, notes: 'Craft line - lower volume' },
  { id: s(5), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_DRAUGHT, name: 'Aspall Cider', sku: 'ASP-11G', unit: 'keg', unitSize: '11gal', currentQty: 2, parLevel: 2, reorderQty: 2, costPerUnit: 84.0, avgWeeklyUsage: 1.8, notes: null },
  // Spirits
  { id: s(6), venueId: VENUE_CROWN, supplierId: SUPPLIER_DIAGEO, categoryId: CAT_SPIRITS, name: 'Smirnoff Vodka', sku: 'SMI-70CL', unit: 'bottle', unitSize: '70cl', currentQty: 6, parLevel: 6, reorderQty: 6, costPerUnit: 14.5, avgWeeklyUsage: 4.0, notes: null },
  { id: s(7), venueId: VENUE_CROWN, supplierId: SUPPLIER_DIAGEO, categoryId: CAT_SPIRITS, name: 'Johnnie Walker Red Label', sku: 'JWR-70CL', unit: 'bottle', unitSize: '70cl', currentQty: 4, parLevel: 4, reorderQty: 4, costPerUnit: 17.2, avgWeeklyUsage: 2.5, notes: null },
  { id: s(8), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_SPIRITS, name: 'Hendricks Gin', sku: 'HEN-70CL', unit: 'bottle', unitSize: '70cl', currentQty: 3, parLevel: 4, reorderQty: 4, costPerUnit: 22.0, avgWeeklyUsage: 3.2, notes: 'Gin & tonic popular Friday/Saturday' },
  { id: s(9), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_SPIRITS, name: 'Bacardi Rum', sku: 'BAC-70CL', unit: 'bottle', unitSize: '70cl', currentQty: 2, parLevel: 3, reorderQty: 3, costPerUnit: 12.8, avgWeeklyUsage: 1.5, notes: null },
  { id: s(10), venueId: VENUE_CROWN, supplierId: SUPPLIER_DIAGEO, categoryId: CAT_SPIRITS, name: 'Baileys Irish Cream', sku: 'BAI-70CL', unit: 'bottle', unitSize: '70cl', currentQty: 5, parLevel: 3, reorderQty: 3, costPerUnit: 11.5, avgWeeklyUsage: 1.2, notes: 'Higher stock pre-Christmas' },
  // Wine
  { id: s(11), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_WINE, name: 'Pinot Grigio (House White)', sku: 'PNG-75CL', unit: 'bottle', unitSize: '75cl', currentQty: 12, parLevel: 12, reorderQty: 12, costPerUnit: 5.8, avgWeeklyUsage: 8.0, notes: null },
  { id: s(12), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_WINE, name: 'Merlot (House Red)', sku: 'MER-75CL', unit: 'bottle', unitSize: '75cl', currentQty: 8, parLevel: 12, reorderQty: 12, costPerUnit: 5.6, avgWeeklyUsage: 6.5, notes: null },
  { id: s(13), venueId: VENUE_CROWN, supplierId: SUPPLIER_MATTHEW_CLARK, categoryId: CAT_WINE, name: 'Prosecco', sku: 'PRO-75CL', unit: 'bottle', unitSize: '75cl', currentQty: 18, parLevel: 12, reorderQty: 12, costPerUnit: 7.2, avgWeeklyUsage: 10.0, notes: 'Busy weekends. Keep 6 in fridge.' },
  // Soft Drinks
  { id: s(14), venueId: VENUE_CROWN, supplierId: SUPPLIER_COCA_COLA, categoryId: CAT_SOFT_DRINKS, name: 'Coca-Cola Post-Mix', sku: 'COK-BAG', unit: 'unit', unitSize: '10L bag', currentQty: 4, parLevel: 3, reorderQty: 3, costPerUnit: 18.0, avgWeeklyUsage: 2.5, notes: null },
  { id: s(15), venueId: VENUE_CROWN, supplierId: SUPPLIER_COCA_COLA, categoryId: CAT_SOFT_DRINKS, name: 'Diet Coke Post-Mix', sku: 'DCO-BAG', unit: 'unit', unitSize: '10L bag', currentQty: 2, parLevel: 2, reorderQty: 2, costPerUnit: 18.0, avgWeeklyUsage: 1.8, notes: null },
  { id: s(16), venueId: VENUE_CROWN, supplierId: SUPPLIER_COCA_COLA, categoryId: CAT_SOFT_DRINKS, name: 'Red Bull', sku: 'RBL-25CL', unit: 'case', unitSize: '24x250ml', currentQty: 3, parLevel: 2, reorderQty: 2, costPerUnit: 21.0, avgWeeklyUsage: 1.5, notes: null },
  { id: s(17), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_SOFT_DRINKS, name: 'J2O Variety Pack', sku: 'J2O-MIX', unit: 'case', unitSize: '24x275ml', currentQty: 1, parLevel: 2, reorderQty: 2, costPerUnit: 14.4, avgWeeklyUsage: 0.8, notes: null },
  // Food
  { id: s(18), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_FOOD, name: 'Pork Scratchings', sku: 'PSC-BOX', unit: 'case', unitSize: '24 bags', currentQty: 5, parLevel: 4, reorderQty: 4, costPerUnit: 12.0, avgWeeklyUsage: 2.0, notes: null },
  { id: s(19), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_FOOD, name: 'Ready Salted Crisps', sku: 'CRS-RS', unit: 'case', unitSize: '48 bags', currentQty: 3, parLevel: 4, reorderQty: 4, costPerUnit: 9.6, avgWeeklyUsage: 3.5, notes: null },
  { id: s(20), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_FOOD, name: 'Nuts Mixed', sku: 'NUT-MIX', unit: 'case', unitSize: '24 bags', currentQty: 2, parLevel: 3, reorderQty: 3, costPerUnit: 10.8, avgWeeklyUsage: 1.5, notes: null },
  // Cleaning
  { id: s(21), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_CLEANING, name: 'Line Cleaner', sku: 'LCL-5L', unit: 'unit', unitSize: '5L', currentQty: 2, parLevel: 2, reorderQty: 2, costPerUnit: 8.5, avgWeeklyUsage: 0.5, notes: 'Use every Monday for line clean' },
  { id: s(22), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_CLEANING, name: 'Glass Wash Detergent', sku: 'GWD-5L', unit: 'unit', unitSize: '5L', currentQty: 1, parLevel: 2, reorderQty: 2, costPerUnit: 6.2, avgWeeklyUsage: 1.0, notes: null },
  // Disposables
  { id: s(23), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_DISPOSABLES, name: 'Paper Napkins', sku: 'NAP-500', unit: 'pack', unitSize: '500', currentQty: 8, parLevel: 5, reorderQty: 5, costPerUnit: 3.2, avgWeeklyUsage: 2.0, notes: null },
  { id: s(24), venueId: VENUE_CROWN, supplierId: SUPPLIER_BRAKES, categoryId: CAT_DISPOSABLES, name: 'Cocktail Straws', sku: 'STR-250', unit: 'pack', unitSize: '250', currentQty: 4, parLevel: 4, reorderQty: 4, costPerUnit: 1.8, avgWeeklyUsage: 1.5, notes: null },
]

const d = (i: number) => `e0000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`

export type KnowledgeSeed = {
  id: string
  venueId: string | null
  title: string
  category: string
  content: string
  updatedBy: string | null
}

export const knowledgeSeeds: ReadonlyArray<KnowledgeSeed> = [
  {
    id: d(1),
    venueId: null,
    title: 'Ice Machine - Troubleshooting Guide',
    category: 'equipment',
    updatedBy: 'Head Office',
    content: `# Ice Machine Troubleshooting

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
- Every 6 months: Filter replacement — engineer will contact to schedule.`,
  },
  {
    id: d(2),
    venueId: null,
    title: 'Cellar Management - Best Practice',
    category: 'equipment',
    updatedBy: 'Head Office',
    content: `# Cellar Management

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
6. Log the clean in the cellar book.`,
  },
  {
    id: d(3),
    venueId: VENUE_CROWN,
    title: 'Opening Procedure - The Crown',
    category: 'opening',
    updatedBy: 'The Crown Manager',
    content: `# Opening Procedure — The Crown

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
- [ ] Unlock front door and turn CLOSED sign to OPEN`,
  },
  {
    id: d(4),
    venueId: VENUE_CROWN,
    title: 'Closing Procedure - The Crown',
    category: 'closing',
    updatedBy: 'The Crown Manager',
    content: `# Closing Procedure — The Crown

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

If you are the last person on site, text the area manager to confirm close: **Luke Barlow — 07700 900456**`,
  },
  {
    id: d(5),
    venueId: VENUE_CROWN,
    title: 'Fire Emergency Procedure - The Crown',
    category: 'emergency',
    updatedBy: 'Head Office',
    content: `# Fire Emergency Procedure — The Crown

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

Fire extinguisher inspection is due every 12 months. Last inspection: January 2025.`,
  },
  {
    id: d(6),
    venueId: VENUE_CROWN,
    title: 'Weekly Ordering Guide - The Crown',
    category: 'operations',
    updatedBy: 'The Crown Manager',
    content: `# Weekly Ordering Guide — The Crown

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
- Matthew Clark offer a free delivery on orders over £500. Try to consolidate.`,
  },
]

export type VenueContactSeed = {
  venueId: string
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
  notes: string | null
}

export const venueContacts: ReadonlyArray<VenueContactSeed> = [
  { venueId: VENUE_CROWN, name: 'Luke Barlow', role: 'Area Manager', phone: '07700 900456', email: 'luke.barlow@thecrowngroup.co.uk', isEmergencyContact: true, notes: 'Contact for major incidents, close-down confirmation, and operational issues.' },
  { venueId: VENUE_CROWN, name: 'Sarah Mitchell', role: 'Head Bartender', phone: '07700 900789', email: null, isEmergencyContact: false, notes: 'Key holder. First contact for shift issues.' },
  { venueId: VENUE_CROWN, name: 'Coolsure Refrigeration', role: 'Equipment Engineer', phone: '01772 445566', email: 'service@coolsure.co.uk', isEmergencyContact: false, notes: 'Ice machine, cellar cooler, glass fridges. Out of hours: 07700 900123' },
  { venueId: VENUE_CROWN, name: 'Preston Properties Ltd', role: 'Landlord', phone: '01772 663344', email: null, isEmergencyContact: true, notes: 'Building owner — contact for structural issues, floods, power failure.' },
]
