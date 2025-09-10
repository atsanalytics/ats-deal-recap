# ATS Deal Recap

A React TypeScript application for managing and analyzing ATS (Applicant Tracking System) deal recaps with AI-powered insights.

## Features

- **Deal Management**: Create, read, update, and delete deals
- **AI Integration**: OpenAI-powered deal analysis and insights
- **Chat System**: User messaging and conversation management
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Service Layer**: Clean API abstraction with error handling

## Type Definitions

### User Type

The `User` type defines user information, user can be our traders or counterparty's traders:

```typescript
interface User {
    id: number;                    // Unique User identifier
    name: string;                  // User's full name
    is_couterparty: boolean;     // User is our trader or counterparty's
    company?: string | null; // Counterparty company, null if our 
    office?: 'ATC' | 'ATS' | string | null; // Our Office location, null if counterparty
    desk?: 'crude' | 'gasoline' | ... | null; // Our Trading desk, null if counter party
}
```


### Message Type

The `Message` type defines chat message structure:

```typescript
interface Message {
    id: number;        // Unique message identifier
    chat_id: number;   // ID of the chat this message belongs to
    user_id: number;   // ID of the user who sent the message
    date: Date;        // Timestamp when message was sent
    content: string;   // Message text content
}
```

### Chat Type

The `Chat` type defines conversation structure:

```typescript
interface Chat {
    id: number;           // Unique chat identifier
    messages: Message[];  // Array of messages in the chat
    status: 'NEW' | 'PROCESSED' | 'DONE' | ... // 
}
```

## Deal Structure

The `Deal` type defines the structure for deal data in the ATS system:

```typescript
interface Deal {
    id: number;
    counter_party_company: string;        // Trading counterparty
    office: 'ATC' | 'ATS' | string;       // Office location
    desk: 'crude' | 'gasoline' | ...;     // Trading desk
    product: 'crude' | 'gasoline' | ...;  // Product type
    laycan_start: Date;                   
    laycan_end: Date;                     
    volume: number;                       // Volume amount
    volume_uom: 'BBL' | 'MT' | ...;      // Unit of measure
    deliver_method: 'vessel' | ...;       // Delivery method
    delivery_port: string;                // Delivery port
    vessel_name?: string;                  // Vessel Name (optional)
    inco_term: 'FOB' | 'CIF' | ...;      // Incoterms
    inspection_agent: 'SGS' | ...;       // Inspection company
    price?: number;                      // Price
    price_basis?: 'dated_brent' | ...;    // Price reference
    price_diff?: number;                 // Price differential to reference
    price_window_start: Date;                
    price_window_end: Date;
    currency: 'USD' | 'EUR' | ...;       // Currency
    deal_type: 'crude_physical' | ...;   // Deal category
    deal_subtype: 'spot' | 'term' | ...; // Deal subcategory
}
```

## Example Deal

```typescript
const exampleDeal: Deal = {
    id: 1,
    counter_party_company: "Shell Trading",
    office: "ATS",
    desk: "crude",
    product: "crude",
    laycan_start: new Date("2025-01-15"),
    laycan_end: new Date("2025-01-17"),
    volume: 10000,
    volume_uom: "BBL",
    deliver_method: "vessel",
    delivery_port: "Basrah",
    vessel_name: "Tanker Alpha",
    inco_term: "FOB",
    inspection_agent: "SGS",
    price_basis: "dated_brent",
    price_diff: 0.25,
    price_window_start: new Date("2025-01-14"),
    price_window_end: new Date("2025-01-16"),
    currency: "USD",
    deal_type: "crude_physical",
    deal_subtype: "spot"
};
```


## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

## Services

- **DealService**: CRUD operations for deals
- **OpenAIService**: AI-powered analysis and insights
- **BaseApiService**: Common API functionality

## Example Usage

### User Management
```typescript
// Our trader
const ourTrader: User = {
    id: 1,
    name: "John Smith",
    is_couterparty: false,
    company: null,
    office: "ATS",
    desk: "crude"
};

// Counterparty trader
const counterpartyTrader: User = {
    id: 2,
    name: "Sarah Johnson",
    is_couterparty: true,
    company: "Shell Trading",
    office: null,
    desk: null
};
```

### Chat System
```typescript
const message: Message = {
    id: 1,
    chat_id: 1,
    user_id: 1,
    date: new Date(),
    content: "Please review the deal details"
};

const chat: Chat = {
    id: 1,
    messages: [message],
    status: "NEW"
};
```

