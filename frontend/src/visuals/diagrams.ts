// Step-through diagrams for system design (HLD) and object design (LLD) lessons.
// Each step lights up some boxes/arrows (`on`); everything lit in earlier steps stays visible, dimmed,
// so the picture builds up the way you'd draw it on a whiteboard. `all` shows the finished picture.
// Coordinates are box centres in a 680 × 360 canvas.

export type NodeKind = 'client' | 'service' | 'store' | 'cache' | 'queue' | 'external' | 'class' | 'state' | 'cell' | 'pin';
export type EdgeKind = 'flow' | 'uses' | 'dep' | 'inherit' | 'realize' | 'compose' | 'aggregate';

export type DNode = { id: string; label: string; kind: NodeKind; x: number; y: number; w?: number; h?: number; sub?: string; stereo?: string; fields?: string[] };
export type DEdge = { from: string; to: string; kind?: EdgeKind; label?: string; curve?: number; id?: string };
export type DStep = { note: string; on?: string[]; all?: boolean };
export type Diagram = { title: string; nodes: DNode[]; edges: DEdge[]; steps: DStep[] };

export const edgeKey = (e: DEdge) => e.id ?? `${e.from}>${e.to}`;

const n = (id: string, label: string, kind: NodeKind, x: number, y: number, more: Partial<DNode> = {}): DNode => ({ id, label, kind, x, y, ...more });
const cls = (id: string, label: string, x: number, y: number, fields: string[] = [], more: Partial<DNode> = {}): DNode => ({ id, label, kind: 'class', x, y, fields, ...more });
const e = (from: string, to: string, kind: EdgeKind = 'flow', label?: string, more: Partial<DEdge> = {}): DEdge => ({ from, to, kind, label, ...more });

export const DIAGRAMS: Record<string, Diagram> = {
    // ---------- High-level design ----------
    'sd-blocks': {
        title: 'A request through the building blocks',
        nodes: [
            n('client', 'Client', 'client', 70, 180),
            n('cdn', 'CDN', 'external', 210, 60, { sub: 'images, JS, CSS' }),
            n('blob', 'Object store', 'store', 420, 60, { sub: 'S3 / GCS' }),
            n('lb', 'Load balancer', 'service', 210, 180),
            n('app', 'App servers', 'service', 360, 180, { sub: 'stateless × N' }),
            n('cache', 'Cache', 'cache', 560, 130, { sub: 'Redis' }),
            n('db', 'Database', 'store', 560, 230, { sub: 'primary + replicas' }),
            n('queue', 'Queue', 'queue', 360, 310, { sub: 'Kafka / SQS' }),
            n('worker', 'Workers', 'service', 560, 320, { sub: 'background jobs' }),
        ],
        edges: [
            e('client', 'lb', 'flow', 'HTTPS'), e('client', 'cdn'), e('cdn', 'blob', 'flow', 'on miss'), e('lb', 'app'),
            e('app', 'cache', 'flow', 'read'), e('app', 'db', 'flow', 'miss / write'), e('app', 'queue', 'flow', 'slow work'), e('queue', 'worker'),
        ],
        steps: [
            { on: ['client', 'lb', 'client>lb'], note: 'A request reaches the load balancer, which spreads traffic so no single server is the bottleneck (and routes around dead ones).' },
            { on: ['cdn', 'blob', 'client>cdn', 'cdn>blob'], note: 'Static files never touch your servers: the CDN serves them from an edge near the user and fetches misses from the object store.' },
            { on: ['app', 'lb>app'], note: 'App servers keep no session state (it lives in a shared store), so you scale by simply adding more behind the load balancer.' },
            { on: ['cache', 'app>cache'], note: 'Reads check the cache first. A hit costs ~1 ms; read-heavy systems serve most traffic from here.' },
            { on: ['db', 'app>db'], note: 'Cache miss or a write → the database. Replicas take reads, the primary takes writes.' },
            { on: ['queue', 'worker', 'app>queue', 'queue>worker'], note: 'Slow work (emails, thumbnails, fan-out) goes on a queue so the request returns fast; workers process it in the background.' },
            { all: true, note: 'The whole picture. In the interview, draw this first in 2 minutes, then deep-dive the one box that is hardest for this problem.' },
        ],
    },
    'chat-message-path': {
        title: 'Sending one chat message',
        nodes: [
            n('alice', 'Alice', 'client', 60, 90),
            n('gwa', 'Gateway A', 'service', 190, 90, { sub: 'holds WebSockets' }),
            n('chat', 'Chat service', 'service', 340, 90, { sub: 'assigns seq #' }),
            n('db', 'Message store', 'store', 340, 250, { sub: 'Cassandra' }),
            n('reg', 'Session registry', 'cache', 500, 250, { sub: 'user → gateway' }),
            n('gwb', 'Gateway B', 'service', 490, 90),
            n('bob', 'Bob', 'client', 620, 90),
            n('push', 'Push service', 'external', 620, 250, { sub: 'APNs / FCM' }),
        ],
        edges: [
            e('alice', 'gwa', 'flow', 'send'), e('gwa', 'chat'), e('chat', 'db', 'flow', '1 persist'), e('chat', 'reg', 'uses', '2 where is Bob?'),
            e('chat', 'gwb', 'flow', '3 route'), e('gwb', 'bob', 'flow', 'deliver'), e('chat', 'push', 'flow', 'if offline', { curve: -40 }),
        ],
        steps: [
            { on: ['alice', 'gwa', 'alice>gwa'], note: "Alice's app keeps one WebSocket open to a gateway server. The message goes up it with a client-made id, so a retry can be de-duplicated." },
            { on: ['chat', 'gwa>chat'], note: 'The gateway hands it to the chat service, which gives it the next sequence number in this conversation — that is what defines order.' },
            { on: ['db', 'chat>db'], note: 'Persist first. Only after the write is durable does Alice see ✓ (sent). A crash after this point loses nothing.' },
            { on: ['reg', 'chat>reg'], note: "Which gateway holds Bob's socket? A session registry (Redis) maps user → gateway and is updated on every connect/disconnect." },
            { on: ['gwb', 'bob', 'chat>gwb', 'gwb>bob'], note: "Route to that gateway, which pushes it down Bob's socket. Bob's app acks → ✓✓ delivered." },
            { on: ['push', 'chat>push'], note: 'Bob offline? Send a push notification instead. When he reconnects he asks for everything after the last sequence number he has.' },
        ],
    },
    'booking-hold': {
        title: 'Booking without double-selling',
        nodes: [
            n('user', 'User', 'client', 60, 190),
            n('api', 'Booking API', 'service', 200, 190),
            n('idem', 'Idempotency keys', 'cache', 200, 60, { sub: 'key → result' }),
            n('inv', 'Inventory', 'store', 360, 190, { sub: 'room type × date' }),
            n('hold', 'Hold', 'state', 360, 60, { sub: 'expires in 10 min' }),
            n('pay', 'Payment provider', 'external', 510, 190),
            n('ok', 'Confirmed', 'state', 620, 300),
        ],
        edges: [
            e('user', 'api', 'flow', 'book(key)'), e('api', 'idem', 'uses', 'seen key?'), e('api', 'inv', 'flow', 'conditional update'), e('inv', 'hold'),
            e('api', 'pay', 'flow', 'charge', { curve: 45 }), e('pay', 'ok', 'flow', 'success'), e('hold', 'inv', 'flow', 'expiry releases', { id: 'release', curve: 40 }),
        ],
        steps: [
            { on: ['user', 'api', 'idem', 'user>api', 'api>idem'], note: 'Every request carries an idempotency key. A double click or network retry finds the key and gets the original answer — no second booking.' },
            { on: ['inv', 'api>inv'], note: 'UPDATE inventory SET available = available − 1 WHERE type = ? AND date = ? AND available > 0. Zero rows changed = sold out. The database makes this atomic, so two users can never both get the last room.' },
            { on: ['hold', 'inv>hold'], note: 'The room is now held for this user, with an expiry — everyone else sees it as taken while they pay.' },
            { on: ['pay', 'api>pay'], note: 'Charge the card, passing the same idempotency key to the payment provider so retries never charge twice.' },
            { on: ['ok', 'pay>ok'], note: 'Payment succeeds → the booking is confirmed.' },
            { on: ['release', 'inv'], note: 'Payment fails or the hold expires → a sweeper adds the room back. No room is lost, none is sold twice.' },
        ],
    },
    'feed-fanout': {
        title: 'Building the home feed (hybrid fan-out)',
        nodes: [
            n('poster', 'Poster', 'client', 60, 70),
            n('post', 'Post service', 'service', 200, 70),
            n('pdb', 'Posts DB', 'store', 200, 190),
            n('q', 'Fan-out queue', 'queue', 360, 70),
            n('w', 'Fan-out workers', 'service', 520, 70, { sub: 'look up followers' }),
            n('fc', 'Feed cache', 'cache', 520, 190, { sub: 'per user: post ids' }),
            n('reader', 'Reader', 'client', 60, 300),
            n('feed', 'Feed service', 'service', 300, 300),
            n('celeb', 'Celebrity posts', 'store', 560, 300, { sub: 'pulled at read' }),
        ],
        edges: [
            e('poster', 'post'), e('post', 'pdb', 'flow', 'store once'), e('post', 'q', 'flow', 'event'), e('q', 'w'), e('w', 'fc', 'flow', 'push id to each follower'),
            e('reader', 'feed', 'flow', 'open app'), e('feed', 'fc', 'flow', 'read list'), e('feed', 'celeb', 'flow', 'merge'),
        ],
        steps: [
            { on: ['poster', 'post', 'pdb', 'poster>post', 'post>pdb'], note: 'A new post is stored once in the posts DB (the photo itself goes to object storage + CDN).' },
            { on: ['q', 'w', 'post>q', 'q>w'], note: "Fan-out on write: an event goes on a queue, and workers look up the poster's followers." },
            { on: ['fc', 'w>fc'], note: "Workers push the post id onto each follower's feed list in the cache. Writes get expensive so that reads become one cache lookup." },
            { on: ['reader', 'feed', 'reader>feed', 'feed>fc'], note: 'Opening the app reads that precomputed list — fast, no joins, then hydrate the post details.' },
            { on: ['celeb', 'feed>celeb'], note: 'Celebrities with millions of followers are skipped at write time (fan-out would take minutes). Their recent posts are pulled and merged at read time. This hybrid is the answer interviewers look for.' },
        ],
    },
    'saga-orchestration': {
        title: 'Saga with an orchestrator',
        nodes: [
            n('order', 'Order service', 'service', 130, 180, { sub: 'saga orchestrator', w: 150 }),
            n('pay', 'Payment', 'service', 420, 60),
            n('inv', 'Inventory', 'service', 420, 180),
            n('ship', 'Shipping', 'service', 420, 300),
            n('log', 'Saga log', 'store', 130, 310, { sub: 'step reached' }),
        ],
        edges: [
            e('order', 'log', 'uses', 'record each step'),
            e('order', 'pay', 'flow', '1 charge'), e('order', 'inv', 'flow', '2 reserve ✗'),
            e('order', 'pay', 'flow', 'undo: refund', { id: 'refund', curve: -55 }),
            e('order', 'ship', 'flow', '3 ship'),
        ],
        steps: [
            { on: ['order', 'log', 'order>log'], note: 'The order service runs the saga as a state machine and records each step, so it can resume after a crash.' },
            { on: ['pay', 'order>pay'], note: 'Step 1: charge the payment — a local transaction inside the payment service.' },
            { on: ['inv', 'order>inv'], note: 'Step 2: reserve stock. Suppose this fails: out of stock.' },
            { on: ['refund', 'pay'], note: 'There is no rollback across services, so the orchestrator runs compensating actions in reverse order: refund the payment. Every step needs an undo.' },
            { on: ['ship', 'order>ship'], note: 'On the happy path, step 3 books shipping and the saga completes. Choreography does the same with events and no coordinator: less coupling, harder to follow.' },
        ],
    },
    outbox: {
        title: 'Transactional outbox',
        nodes: [
            n('svc', 'Order service', 'service', 80, 180),
            n('db', 'Database', 'store', 240, 180, { sub: 'orders + outbox', w: 130 }),
            n('relay', 'Relay', 'service', 400, 180, { sub: 'polls or CDC' }),
            n('broker', 'Kafka', 'queue', 540, 180),
            n('c1', 'Email', 'service', 620, 70, { w: 100 }),
            n('c2', 'Inventory', 'service', 620, 300, { w: 100 }),
        ],
        edges: [
            e('svc', 'db', 'flow', 'one transaction'), e('db', 'relay', 'flow', 'unsent rows'), e('relay', 'broker', 'flow', 'publish'),
            e('broker', 'c1'), e('broker', 'c2'),
        ],
        steps: [
            { on: ['svc', 'db', 'svc>db'], note: "Write the order AND an 'OrderPlaced' row into an outbox table in the same database transaction. Either both happen or neither does." },
            { on: ['relay', 'db>relay'], note: "A relay reads outbox rows that haven't been sent (by polling, or by tailing the database log with change-data-capture)." },
            { on: ['broker', 'relay>broker'], note: 'It publishes them, then marks them sent. If it crashes in between it publishes again — at-least-once delivery.' },
            { on: ['c1', 'c2', 'broker>c1', 'broker>c2'], note: 'So consumers must be idempotent: store processed event ids and ignore repeats. Outbox + idempotent consumers = effectively exactly-once.' },
        ],
    },
    'geohash-cells': {
        title: 'Geohash: search 9 cells, not 1',
        nodes: [
            ...[
                ['9q8vf', 'nw'], ['9q8yg', 'n'], ['9q8yu', 'ne'],
                ['9q8vc', 'w'], ['9q8yy', 'c'], ['9q8yv', 'e'],
                ['9q8v9', 'sw'], ['9q8yd', 's'], ['9q8yt', 'se'],
            ].map(([hash, id], i) => n(id, hash, 'cell', 220 + (i % 3) * 120, 70 + Math.floor(i / 3) * 110, { w: 116, h: 106 })),
            n('you', 'you', 'pin', 368, 160, { w: 50, h: 24 }),
            n('cafe', 'café, 50 m', 'pin', 452, 190, { w: 80, h: 24 }),
        ],
        edges: [],
        steps: [
            { on: ['c', 'you'], note: 'Your location hashes to 9q8yy. Places in the same cell share that prefix, so one prefix lookup in an index finds them.' },
            { on: ['c', 'you', 'e', 'cafe'], note: 'But a café 50 m away, just across the edge, is in cell 9q8yv. Searching only your cell misses it.' },
            { on: ['nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se', 'you', 'cafe'], note: 'So search your cell plus its 8 neighbours — 9 prefix lookups — then filter by real distance and sort.' },
            { all: true, note: 'Pick the precision so one cell is about the search radius: 6 characters ≈ 1.2 km × 0.6 km. Too small a radius? Use more characters.' },
        ],
    },
    'proximity-arch': {
        title: 'Nearby search, read-heavy',
        nodes: [
            n('client', 'Client', 'client', 60, 180),
            n('lb', 'Load balancer', 'service', 190, 180),
            n('loc', 'Location service', 'service', 350, 90, { sub: 'search (reads)', w: 140 }),
            n('biz', 'Business service', 'service', 350, 280, { sub: 'add / edit (writes)', w: 140 }),
            n('idx', 'Geo index', 'cache', 560, 40, { sub: 'geohash → ids, in RAM' }),
            n('rep', 'Read replicas', 'store', 560, 160),
            n('db', 'Primary DB', 'store', 560, 280),
        ],
        edges: [
            e('client', 'lb'), e('lb', 'loc'), e('lb', 'biz'), e('loc', 'idx', 'flow', '9 cells'), e('loc', 'rep', 'flow', 'details'),
            e('biz', 'db'), e('db', 'rep', 'flow', 'replicate'), e('db', 'idx', 'flow', 'refresh', { curve: -70 }),
        ],
        steps: [
            { on: ['client', 'lb', 'loc', 'client>lb', 'lb>loc'], note: 'Searches outnumber edits ~100 to 1, so reads and writes get separate services that scale independently.' },
            { on: ['idx', 'loc>idx'], note: "The location service hashes the user's position, adds the 8 neighbour cells and looks up business ids in an in-memory index — a few GB even for 200M places." },
            { on: ['rep', 'loc>rep'], note: 'It fetches details for those ids from read replicas (or a cache), filters by exact distance, sorts and returns.' },
            { on: ['biz', 'db', 'lb>biz', 'biz>db'], note: 'Owners adding or editing a business go through the write service to the primary.' },
            { on: ['db>rep', 'db>idx'], note: 'Changes replicate to the replicas; the geo index refreshes nightly or from change events. Places rarely move, so a little staleness is fine — say so explicitly.' },
        ],
    },

    // ---------- Low-level design ----------
    'uml-basics': {
        title: 'Reading a UML class diagram',
        nodes: [
            cls('vehicle', 'Vehicle', 260, 70, ['− plate: str', '+ wheels(): int'], { stereo: '«abstract»' }),
            cls('drivable', 'Drivable', 520, 70, ['+ drive()'], { stereo: '«interface»' }),
            cls('car', 'Car', 150, 220, ['+ wheels(): 4']),
            cls('bike', 'Bike', 370, 220, ['+ wheels(): 2']),
            cls('garage', 'Garage', 560, 230, ['− vehicles: List']),
            cls('engine', 'Engine', 150, 320, ['− hp: int']),
        ],
        edges: [
            e('car', 'vehicle', 'inherit'), e('bike', 'vehicle', 'inherit'), e('vehicle', 'drivable', 'realize'),
            e('garage', 'vehicle', 'aggregate', '0..*'), e('car', 'engine', 'compose', '1'),
        ],
        steps: [
            { on: ['vehicle'], note: 'A class box: name on top, then fields, then methods. + public, − private. «abstract» or «interface» above the name.' },
            { on: ['car', 'bike', 'car>vehicle', 'bike>vehicle'], note: 'Inheritance (is-a): solid line with a hollow triangle pointing at the parent. A Car is a Vehicle.' },
            { on: ['drivable', 'vehicle>drivable'], note: 'Implements an interface: dashed line with a hollow triangle. Vehicle promises drive().' },
            { on: ['garage', 'garage>vehicle'], note: 'Aggregation (has-a, can live apart): hollow diamond on the owner. Vehicles exist without the garage.' },
            { on: ['engine', 'car>engine'], note: 'Composition (owns, same lifetime): filled diamond on the owner. The engine is created and destroyed with its car.' },
            { all: true, note: 'That is all the notation an interview needs — plus multiplicities (1, 0..*, 1..*) on the important lines.' },
        ],
    },
    'strategy-pattern': {
        title: 'Strategy pattern',
        nodes: [
            cls('checkout', 'Checkout', 120, 180, ['− strategy: PaymentStrategy', '+ pay(amount)'], { w: 190 }),
            cls('strategy', 'PaymentStrategy', 380, 180, ['+ pay(amount)'], { stereo: '«interface»', w: 150 }),
            cls('card', 'CardPayment', 590, 60, [], { w: 130 }),
            cls('upi', 'UpiPayment', 590, 180, [], { w: 130 }),
            cls('wallet', 'WalletPayment', 590, 300, [], { w: 130 }),
        ],
        edges: [
            e('checkout', 'strategy', 'uses', 'has a'), e('card', 'strategy', 'realize'), e('upi', 'strategy', 'realize'), e('wallet', 'strategy', 'realize'),
        ],
        steps: [
            { on: ['checkout'], note: "Checkout must take payment but shouldn't know how each payment method works." },
            { on: ['strategy', 'checkout>strategy'], note: 'It holds a PaymentStrategy and only ever calls pay(amount) on it.' },
            { on: ['card', 'upi', 'wallet', 'card>strategy', 'upi>strategy', 'wallet>strategy'], note: 'Each method is its own small class implementing that interface.' },
            { on: ['checkout', 'upi', 'checkout>strategy'], note: 'At runtime pick one (e.g. from what the user chose). Adding Pay-Later = one new class and zero edits to Checkout: the open/closed principle.' },
        ],
    },
    'observer-pattern': {
        title: 'Observer pattern',
        nodes: [
            cls('subject', 'OrderService', 120, 180, ['− observers: List', '+ subscribe(o)', '+ placeOrder()'], { w: 170 }),
            cls('observer', 'OrderObserver', 380, 180, ['+ onEvent(e)'], { stereo: '«interface»', w: 140 }),
            cls('email', 'EmailSender', 590, 60, [], { w: 130 }),
            cls('sms', 'SmsSender', 590, 180, [], { w: 130 }),
            cls('analytics', 'Analytics', 590, 300, [], { w: 130 }),
        ],
        edges: [
            e('subject', 'observer', 'uses', 'notifies 0..*'), e('email', 'observer', 'realize'), e('sms', 'observer', 'realize'), e('analytics', 'observer', 'realize'),
        ],
        steps: [
            { on: ['subject'], note: "The subject keeps a list of observers and doesn't know their concrete classes." },
            { on: ['observer', 'subject>observer'], note: 'Anything that wants to hear about orders implements one method: onEvent(e).' },
            { on: ['email', 'sms', 'analytics', 'email>observer', 'sms>observer', 'analytics>observer'], note: 'Email, SMS and analytics each subscribe themselves.' },
            { on: ['subject', 'subject>observer'], note: 'placeOrder() loops over the list calling onEvent. New listener = no change to OrderService. Across services the same idea becomes pub/sub on a message broker.' },
        ],
    },
    'parking-lot-classes': {
        title: 'Parking lot classes',
        nodes: [
            cls('lot', 'ParkingLot', 110, 60, ['+ park(v): Ticket', '+ unpark(t): Fee'], { w: 160 }),
            cls('floor', 'Floor', 110, 210, ['− spots']),
            cls('spot', 'Spot', 330, 210, ['− id, size', '+ isFree()'], { stereo: '«abstract»' }),
            cls('compact', 'CompactSpot', 270, 325, [], { w: 115 }),
            cls('large', 'LargeSpot', 400, 325, [], { w: 115 }),
            cls('strategy', 'SpotStrategy', 360, 60, ['+ find(v): Spot'], { stereo: '«interface»' }),
            cls('ticket', 'Ticket', 580, 90, ['− vehicle, spot', '− entryTime']),
            cls('vehicle', 'Vehicle', 580, 240, ['− plate, size']),
        ],
        edges: [
            e('lot', 'floor', 'compose', '1..*'), e('floor', 'spot', 'compose', '1..*'), e('compact', 'spot', 'inherit'), e('large', 'spot', 'inherit'),
            e('lot', 'strategy', 'uses', 'uses'), e('ticket', 'spot', 'uses'), e('ticket', 'vehicle', 'uses'),
        ],
        steps: [
            { on: ['lot', 'floor', 'spot', 'lot>floor', 'floor>spot'], note: "Start from the nouns: a lot owns floors, a floor owns spots. Composition — spots don't exist without their floor." },
            { on: ['compact', 'large', 'compact>spot', 'large>spot'], note: 'Spot types differ by size; a vehicle fits when spot.size ≥ vehicle.size.' },
            { on: ['strategy', 'lot>strategy'], note: 'Which free spot to give (nearest the entrance, lowest floor) is a strategy, so the rule can change without editing ParkingLot.' },
            { on: ['ticket', 'vehicle', 'ticket>spot', 'ticket>vehicle'], note: 'park() returns a Ticket linking vehicle, spot and entry time; unpark(ticket) frees the spot and computes the fee.' },
            { on: ['lot', 'spot'], note: "Two gates may grab the same spot at once — make 'claim this spot' atomic (a lock per floor, or compare-and-set on the spot)." },
        ],
    },
    'vending-states': {
        title: 'Vending machine states',
        nodes: [
            n('idle', 'Idle', 'state', 90, 180),
            n('money', 'Has money', 'state', 330, 70),
            n('disp', 'Dispensing', 'state', 570, 180),
            n('sold', 'Sold out', 'state', 330, 300),
        ],
        edges: [
            e('idle', 'money', 'flow', 'insert coin', { curve: 22 }), e('money', 'idle', 'flow', 'cancel → refund', { curve: 22 }),
            e('money', 'disp', 'flow', 'select (enough money)'), e('disp', 'idle', 'flow', 'give item + change'),
            e('disp', 'sold', 'flow', 'stock hits 0'), e('sold', 'idle', 'flow', 'restock'),
        ],
        steps: [
            { on: ['idle'], note: 'Start in Idle. Draw states as boxes and inputs as labelled arrows before writing any code.' },
            { on: ['money', 'idle>money'], note: 'Insert coin → Has money. Inserting more stays here; the balance grows.' },
            { on: ['money>idle'], note: 'Cancel → refund the balance and go back to Idle.' },
            { on: ['disp', 'money>disp'], note: "Select an item: if balance ≥ price go to Dispensing; otherwise stay and show 'insert ₹X more'." },
            { on: ['disp>idle'], note: 'Drop the item, return change, back to Idle.' },
            { on: ['sold', 'disp>sold', 'sold>idle'], note: 'Last item gone → Sold out, where every input is rejected until restock. Each box becomes one State class; each arrow, one method on it.' },
        ],
    },
    'rate-limiter-classes': {
        title: 'Rate limiter classes',
        nodes: [
            cls('svc', 'RateLimiterService', 110, 180, ['+ allow(key): bool'], { w: 170 }),
            cls('rules', 'RuleStore', 110, 310, ['limit per API / user']),
            cls('rl', 'RateLimiter', 350, 180, ['+ tryAcquire(key)'], { stereo: '«interface»' }),
            cls('tb', 'TokenBucket', 580, 60, ['− capacity, refillRate', '− tokens, lastRefill'], { w: 170 }),
            cls('sw', 'SlidingWindowLog', 580, 190, ['− timestamps'], { w: 170 }),
            cls('fw', 'FixedWindow', 580, 300, ['− count, windowStart'], { w: 170 }),
            cls('clock', 'Clock', 350, 310, ['+ now()'], { stereo: '«interface»' }),
        ],
        edges: [
            e('svc', 'rules', 'uses', 'reads'), e('svc', 'rl', 'uses', 'per rule'), e('tb', 'rl', 'realize'), e('sw', 'rl', 'realize'), e('fw', 'rl', 'realize'),
            e('rl', 'clock', 'dep', 'time from'),
        ],
        steps: [
            { on: ['svc', 'rules', 'svc>rules'], note: 'The service looks up the rule for this caller (say 100 requests/min per user) and asks a limiter.' },
            { on: ['rl', 'svc>rl'], note: 'Every algorithm hides behind one interface: tryAcquire(key) → allowed or not.' },
            { on: ['tb', 'sw', 'fw', 'tb>rl', 'sw>rl', 'fw>rl'], note: 'Token bucket allows short bursts; sliding-window log is exact but stores timestamps; fixed window is cheapest but lets up to 2× through at a window edge.' },
            { on: ['clock', 'rl>clock'], note: 'Inject a Clock instead of calling time() directly, so tests can fast-forward time.' },
            { on: ['tb'], note: 'Thread safety: a lock per key (or atomic compare-and-set) around refill-then-take. Distributed: keep the counters in Redis and do check-and-decrement in one Lua script.' },
        ],
    },
    'elevator-classes': {
        title: 'Elevator system classes',
        nodes: [
            cls('sys', 'ElevatorSystem', 110, 60, ['+ request(floor, dir)'], { w: 170 }),
            cls('disp', 'Dispatcher', 360, 60, ['+ pick(req): Elevator'], { stereo: '«interface»', w: 160 }),
            cls('near', 'NearestCar', 590, 40, [], { w: 120 }),
            cls('zone', 'ZoneBased', 590, 110, [], { w: 120 }),
            cls('elev', 'Elevator', 110, 220, ['− floor, direction', '− stops: sorted set', '+ step()'], { w: 160 }),
            cls('req', 'Request', 360, 220, ['floor, direction']),
            cls('door', 'Door', 110, 330, ['+ open(), close()']),
        ],
        edges: [
            e('sys', 'elev', 'compose', '1..*'), e('elev', 'req', 'uses', 'stops'), e('sys', 'disp', 'uses', 'asks'),
            e('near', 'disp', 'realize'), e('zone', 'disp', 'realize'), e('elev', 'door', 'compose'),
        ],
        steps: [
            { on: ['sys', 'elev', 'sys>elev'], note: 'The system owns N elevators. Each knows its floor, its direction and a sorted set of stops.' },
            { on: ['req', 'elev>req'], note: 'A hall call is a Request(floor, direction). A button inside the car just adds a stop.' },
            { on: ['disp', 'near', 'zone', 'sys>disp', 'near>disp', 'zone>disp'], note: 'Which car answers is a Dispatcher strategy — nearest car already moving your way, or zone-based in tall buildings.' },
            { on: ['elev'], note: 'Inside one car use LOOK: keep going while there are stops ahead in this direction, then turn around.' },
            { on: ['door', 'elev>door'], note: 'Safety rules live with the parts: never move with the doors open; reopen on obstruction.' },
        ],
    },
    'snakes-classes': {
        title: 'Snakes & ladders classes',
        nodes: [
            cls('game', 'Game', 110, 80, ['− players: Queue', '− board, dice', '+ play()'], { w: 150 }),
            cls('player', 'Player', 110, 270, ['− name, position']),
            cls('board', 'Board', 360, 80, ['− size', '− jumps: Map<int,int>'], { w: 160 }),
            cls('jump', 'Jump', 590, 80, ['start, end']),
            cls('snake', 'Snake', 530, 240, [], { w: 100 }),
            cls('ladder', 'Ladder', 640, 240, [], { w: 80 }),
            cls('dice', 'Dice', 360, 270, ['+ roll(): int'], { stereo: '«interface»' }),
        ],
        edges: [
            e('game', 'board', 'compose'), e('game', 'player', 'compose', '2..4'), e('game', 'dice', 'uses'),
            e('board', 'jump', 'compose', '*'), e('snake', 'jump', 'inherit'), e('ladder', 'jump', 'inherit'),
        ],
        steps: [
            { on: ['game', 'board', 'player', 'game>board', 'game>player'], note: 'Game holds a queue of players and the board. play(): take the front player, roll, move, apply any jump, check for a win, put them back.' },
            { on: ['jump', 'board>jump'], note: 'The board maps start → end. Snakes and ladders are both just jumps, so one map lookup handles both.' },
            { on: ['snake', 'ladder', 'snake>jump', 'ladder>jump'], note: 'Keep Snake and Ladder as types only for validation (a snake must go down, a ladder up).' },
            { on: ['dice', 'game>dice'], note: 'Dice is an interface: inject a fixed-sequence dice in tests so a game is fully predictable.' },
        ],
    },
    'library-classes': {
        title: 'Library management classes',
        nodes: [
            cls('lib', 'Library', 110, 70, ['+ search(q)', '+ checkout(m, item)'], { w: 160 }),
            cls('book', 'Book', 350, 70, ['isbn, title, author'], { w: 150 }),
            cls('item', 'BookItem', 580, 70, ['barcode, status, rack'], { w: 160 }),
            cls('member', 'Member', 110, 240, ['− loans', '+ canBorrow()'], { w: 150 }),
            cls('loan', 'Loan', 350, 240, ['dueDate, returnedOn'], { w: 150 }),
            cls('policy', 'FinePolicy', 580, 240, ['+ fine(loan)'], { stereo: '«interface»' }),
        ],
        edges: [
            e('lib', 'book', 'aggregate', 'catalog'), e('book', 'item', 'compose', '1..*'), e('member', 'loan', 'compose', '0..5'),
            e('loan', 'item', 'uses', 'copy'), e('loan', 'policy', 'dep', 'priced by'),
        ],
        steps: [
            { on: ['lib', 'book', 'lib>book'], note: 'The catalogue holds Books — the title itself (ISBN, author). Searches return Books.' },
            { on: ['item', 'book>item'], note: 'A BookItem is one physical copy with a barcode and a status. Merging Book and BookItem is the classic mistake here.' },
            { on: ['member', 'loan', 'member>loan'], note: 'A Member has active Loans, capped (say 5). canBorrow() checks the cap and unpaid fines.' },
            { on: ['loan>item'], note: 'A Loan links a member to one specific copy, with a due date.' },
            { on: ['policy', 'loan>policy'], note: 'On return a FinePolicy prices any days overdue — a strategy, so rules can differ per member type.' },
        ],
    },
    'movie-domain': {
        title: 'Movie booking domain',
        nodes: [
            cls('city', 'City', 70, 50, [], { w: 90 }),
            cls('cinema', 'Cinema', 210, 50, [], { w: 100 }),
            cls('screen', 'Screen', 360, 50, [], { w: 100 }),
            cls('seat', 'Seat', 560, 50, ['row, number, type'], { w: 150 }),
            cls('movie', 'Movie', 90, 190, ['title, duration'], { w: 140 }),
            cls('show', 'Show', 340, 190, ['movie, screen, startTime'], { w: 180 }),
            cls('showseat', 'ShowSeat', 560, 190, ['seat, show, status'], { w: 150 }),
            cls('booking', 'Booking', 560, 315, ['user, seats, status'], { w: 150 }),
        ],
        edges: [
            e('city', 'cinema', 'compose'), e('cinema', 'screen', 'compose'), e('screen', 'seat', 'compose', '1..*'),
            e('show', 'movie', 'uses'), e('show', 'screen', 'uses'), e('show', 'showseat', 'compose', '1..*'), e('showseat', 'seat', 'uses'),
            e('booking', 'showseat', 'uses', '1..*'),
        ],
        steps: [
            { on: ['city', 'cinema', 'screen', 'seat', 'city>cinema', 'cinema>screen', 'screen>seat'], note: 'The physical side: a city has cinemas, a cinema has screens, a screen has a fixed seat layout.' },
            { on: ['movie', 'show', 'show>movie', 'show>screen'], note: 'A Show is one movie on one screen at one time.' },
            { on: ['showseat', 'show>showseat', 'showseat>seat'], note: 'The key class: ShowSeat = a seat for one show, with its own status. The Seat itself never changes.' },
            { on: ['booking', 'booking>showseat'], note: 'A Booking groups the ShowSeats one user is holding or has paid for.' },
        ],
    },
    'seat-lifecycle': {
        title: 'A show seat, from free to booked',
        nodes: [
            n('free', 'Available', 'state', 100, 180),
            n('held', 'Held', 'state', 340, 70, { sub: '10-min TTL' }),
            n('booked', 'Booked', 'state', 580, 180),
        ],
        edges: [
            e('free', 'held', 'flow', 'select (atomic)', { curve: 22 }), e('held', 'free', 'flow', 'timeout / back', { curve: 22 }),
            e('held', 'booked', 'flow', 'payment OK'), e('booked', 'free', 'flow', 'cancel + refund', { curve: -70 }),
        ],
        steps: [
            { on: ['free'], note: 'Every ShowSeat starts Available.' },
            { on: ['held', 'free>held'], note: "Selecting moves seats to Held atomically: UPDATE … SET status = 'HELD' WHERE id IN (…) AND status = 'AVAILABLE'. Two users race for a seat: exactly one wins." },
            { on: ['held>free'], note: "If payment doesn't finish inside the hold window, a sweeper (or Redis key expiry) releases the seats." },
            { on: ['booked', 'held>booked'], note: 'Payment succeeds → Booked. Use an idempotency key so a retry never charges twice.' },
            { on: ['booked>free'], note: 'Cancellation (if allowed) refunds and makes the seat Available again.' },
        ],
    },
    'rental-lifecycle': {
        title: 'Car rental reservation lifecycle',
        nodes: [
            n('res', 'Reserved', 'state', 90, 180, { sub: 'car type + dates' }),
            n('picked', 'Picked up', 'state', 320, 70, { sub: 'specific car' }),
            n('returned', 'Returned', 'state', 540, 70),
            n('closed', 'Closed', 'state', 590, 200),
            n('cancel', 'Cancelled', 'state', 320, 300),
            n('noshow', 'No-show', 'state', 540, 310),
        ],
        edges: [
            e('res', 'picked', 'flow', 'pick up'), e('picked', 'returned', 'flow', 'return car'), e('returned', 'closed', 'flow', 'final bill paid'),
            e('res', 'cancel', 'flow', 'cancel'), e('res', 'noshow', 'flow', 'grace period passes', { curve: 40 }),
        ],
        steps: [
            { on: ['res'], note: 'A reservation holds a car TYPE (not a specific car) for a date range — availability is "types with free capacity for these dates".' },
            { on: ['cancel', 'res>cancel'], note: 'Cancel before pickup; the fee depends on how close to pickup it is.' },
            { on: ['noshow', 'res>noshow'], note: 'Not collected within the grace period → No-show: charge the penalty and release the capacity.' },
            { on: ['picked', 'res>picked'], note: 'At pickup, assign a specific car and record fuel and odometer.' },
            { on: ['returned', 'closed', 'picked>returned', 'returned>closed'], note: 'On return: price = days × daily rate + extras + late and fuel charges. Pay, then close.' },
        ],
    },
};
