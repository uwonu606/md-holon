---
title: "Memory blocks (core memory)"
site: "Letta Docs"
source: "https://docs.letta.com/guides/agents/memory-blocks"
domain: "docs.letta.com"
language: "en"
description: "Create and manage structured memory blocks via the Letta API"
word_count: 1599
---

> [!note] Note
> Read our [blog post](https://www.letta.com/blog/memory-blocks) to learn more about the origin of memory blocks.

## What are memory blocks?

Memory blocks are structured sections of the agent’s context window that persist across all interactions. They are always visible - no retrieval needed.

Under the hood, memory blocks are simply prepended to the agent’s prompt in an XML-like format. This is what the LLM sees in its context:

```xml
<memory_blocks>

<persona>
<description>The persona block: Stores details about your current persona, guiding how you behave and respond.</description>
<metadata>
- chars_current=128
- chars_limit=5000
</metadata>
<value>I am a helpful assistant named Sam. I enjoy helping users solve problems.</value>
</persona>

<human>
<description>The human block: Stores key details about the person you are conversing with, allowing for more personalized and friend-like conversation.</description>
<metadata>
- chars_current=84
- chars_limit=5000
</metadata>
<value>The user's name is Alice. She is a software engineer who prefers concise answers.</value>
</human>

</memory_blocks>
```

This structure is automatically managed by Letta - you define the blocks, and agents can read and update them using [built-in memory tools](https://docs.letta.com/v1-sdk/tools/builtin-tools).

**Memory blocks are Letta’s core abstraction.** Create a block with a descriptive label and the agent learns how to use it. This simple mechanism enables capabilities impossible with traditional context management.

**Key properties:**

- **Agent-managed** - Agents autonomously organize information based on block labels
- **Flexible** - Use for any purpose: knowledge, guidelines, state tracking, scratchpad space
- **Shareable** - Multiple agents can access the same block; update once, visible everywhere (see [shared memory blocks](https://docs.letta.com/v1-sdk/memory/shared-memory))
- **Always visible** - Blocks stay in context, never need retrieval

**Examples:**

- Store tool usage guidelines so agents avoid past mistakes
- Maintain working memory in a scratchpad block
- Mirror external state (user’s current document) for real-time awareness
- Share read-only policies across all agents from a central source
- Coordinate multi-agent systems: parent agents watch subagent result blocks update in real-time
- Enable emergent behavior: add `performance_tracking` or `emotional_state` and watch agents start using them

Memory blocks aren’t just storage - they’re a coordination primitive that enables sophisticated agent behavior.

## Memory block structure

Memory blocks represent a section of an agent’s context window. An agent may have multiple memory blocks, or none at all. A memory block consists of:

- A `label`, which is a unique identifier for the block
- A `description`, which describes the purpose of the block
- A `value`, which is the contents/data of the block
- A `limit`, which is the size limit (in characters) of the block

## The importance of the description field

When making memory blocks, it’s crucial to provide a good `description` field that accurately describes what the block should be used for. The `description` is the main information used by the agent to determine how to read and write to that block. Without a good description, the agent may not understand how to use the block.

Because `persona` and `human` are two popular block labels, Letta autogenerates default descriptions for these blocks if you don’t provide them. If you provide a description for a memory block labelled `persona` or `human`, the default description will be overridden.

For `persona`, a good default is:

> The persona block: Stores details about your current persona, guiding how you behave and respond. This helps you to maintain consistency and personality in your interactions.

For `human`, a good default is:

> The human block: Stores key details about the person you are conversing with, allowing for more personalized and friend-like conversation.

## Read-only blocks

Memory blocks are read-write by default (so the agent can update the block using memory tools), but can be set to read-only by setting the `read_only` field to `true`. When a block is read-only, the agent cannot update the block.

Read-only blocks are useful when you want to give an agent access to information (for example, a shared memory block about an organization), but you don’t want the agent to be able to make potentially destructive changes to the block.

- [TypeScript](#tab-panel-46)
- [Python](#tab-panel-47)

```typescript
// create a read-only block with company policies
const policiesBlock = await client.blocks.create({
  label: "policies",
  description: "Company policies and guidelines. This block is read-only.",
  value: "1. Always be respectful\n2. Protect customer data\n3. Escalate issues promptly",
  read_only: true,
});
```

## Creating an agent with memory blocks

When you create an agent, you can specify memory blocks to also be created with the agent. For most chat applications, we recommend creating a `human` block (to represent memories about the user) and a `persona` block (to represent the agent’s persona).

- [TypeScript](#tab-panel-48)
- [Python](#tab-panel-49)

```typescript
// install letta-client with \`npm install @letta-ai/letta-client\`
import Letta from "@letta-ai/letta-client";

// create a client connected to the Letta API
const client = new Letta({
  apiKey: process.env.LETTA_API_KEY,
});

// create an agent with two basic self-editing memory blocks
const agentState = await client.agents.create({
  memory_blocks: [
    {
      label: "human",
      value: "The human's name is Bob the Builder.",
      limit: 5000,
    },
    {
      label: "persona",
      value: "My name is Sam, the all-knowing sentient AI.",
      limit: 5000,
    },
  ],
  model: "openai/gpt-4o-mini",
});
```

When the agent is created, the corresponding blocks are also created and attached to the agent, so that the block value will be in the context window.

## Creating and attaching memory blocks

You can also directly create blocks and attach them to an agent. This can be useful if you want to create blocks that are shared between multiple agents. If multiple agents are attached to a block, they will all have the block data in their context windows (essentially providing shared memory).

Below is an example of creating a block directly, and attaching the block to two agents by specifying the `block_ids` field.

- [TypeScript](#tab-panel-50)
- [Python](#tab-panel-51)

```typescript
// create a persisted block, which can be attached to agents
const block = await client.blocks.create({
  label: "organization",
  description: "A block to store information about the organization",
  value: "Organization: Letta",
  limit: 4000,
});

// create an agent with both a shared block and its own blocks
const sharedBlockAgent1 = await client.agents.create({
  name: "shared_block_agent1",
  memory_blocks: [
    {
      label: "persona",
      value: "I am agent 1",
    },
  ],
  block_ids: [block.id],
  model: "openai/gpt-4o-mini",
});

// create another agent with the same shared block
const sharedBlockAgent2 = await client.agents.create({
  name: "shared_block_agent2",
  memory_blocks: [
    {
      label: "persona",
      value: "I am agent 2",
    },
  ],
  block_ids: [block.id],
  model: "openai/gpt-4o-mini",
});
```

You can also attach blocks to existing agents:

- [TypeScript](#tab-panel-52)
- [Python](#tab-panel-53)

```typescript
await client.agents.blocks.attach(agent.id, block.id);
```

You can see all agents attached to a block by using the `block_id` field in the [blocks retrieve](https://docs.letta.com/api/resources/blocks/methods/retrieve) endpoint.

## Managing blocks

### Retrieving a block

You can retrieve the contents of a block by ID. This is useful when blocks store finalized reports, code outputs, or other data you want to extract for use outside the agent.

- [TypeScript](#tab-panel-54)
- [Python](#tab-panel-55)

```typescript
const block = await client.blocks.retrieve(block.id);
console.log(block.value); // access the block's content
```

### Listing blocks

You can list all blocks, optionally filtering by label or searching by label text. This is useful for finding blocks across your project.

- [TypeScript](#tab-panel-56)
- [Python](#tab-panel-57)

```typescript
// list all blocks
const blocks = await client.blocks.list();

// filter by label
const humanBlocks = await client.blocks.list({
  label: "human"
});

// search by label text
const searchResults = await client.blocks.list({
  label_search: "organization"
});
```

### Modifying a block

You can directly modify a block’s content, limit, description, or other properties. This is particularly useful for:

- External scripts that provide up-to-date information to agents (e.g., syncing a text file to a block)
- Updating shared blocks that multiple agents reference
- Programmatically managing block content outside of agent interactions

- [TypeScript](#tab-panel-58)
- [Python](#tab-panel-59)

```typescript
// update the block's value - completely replaces the content
await client.blocks.update(block.id, {
  value: "Updated organization information: Letta - Building agentic AI",
});

// update multiple properties
await client.blocks.update(block.id, {
  value: "New content",
  limit: 6000,
  description: "Updated description",
});
```

> [!note] Note
> **Setting `value` completely replaces the entire block content** - it is not an append operation. If multiple processes (agents or external scripts) modify the same block concurrently, the last write wins and overwrites all earlier changes. To avoid data loss:
> 
> - Set blocks to **read-only** if you don’t want agents to modify them
> - Only modify blocks directly in controlled scenarios where overwriting is acceptable
> - Ensure your application logic accounts for full replacements, not merges

### Deleting a block

You can delete a block when it’s no longer needed. Note that deleting a block will remove it from all agents that have it attached.

- [TypeScript](#tab-panel-60)
- [Python](#tab-panel-61)

```typescript
await client.blocks.delete(block.id);
```

### Inspecting block usage

See which agents have a block attached:

- [TypeScript](#tab-panel-62)
- [Python](#tab-panel-63)

```typescript
// list all agents that use this block
const agentsWithBlock = await client.blocks.agents.list(block.id);
console.log(\`Used by ${agentsWithBlock.length} agents:\`);
for (const agent of agentsWithBlock) {
  console.log(\`  - ${agent.name}\`);
}

// with pagination
const agentsPage = await client.blocks.agents.list(block.id, {
  limit: 10,
  order: "asc",
});
```

## Agent-scoped block operations

### Listing an agent’s blocks

You can retrieve all blocks attached to a specific agent. This shows you the complete memory configuration for that agent.

- [TypeScript](#tab-panel-64)
- [Python](#tab-panel-65)

```typescript
const agentBlocks = await client.agents.blocks.list(agent.id);
```

### Retrieving an agent’s block by label

Instead of using a block ID, you can retrieve a block from a specific agent using its label. This is useful when you want to inspect what the agent currently knows about a specific topic.

- [TypeScript](#tab-panel-66)
- [Python](#tab-panel-67)

```typescript
// get the agent's current knowledge about the human
const humanBlock = await client.agents.blocks.retrieve(agent.id, "human");
console.log(humanBlock.value);
```

### Modifying an agent’s block

You can modify a block through the agent-scoped endpoint using the block’s label. This is useful for updating agent-specific memory without needing to know the block ID.

- [TypeScript](#tab-panel-68)
- [Python](#tab-panel-69)

```typescript
// update the agent's human block
await client.agents.blocks.update(agent.id, "human", {
  value: "The human's name is Alice. She prefers Python over TypeScript."
});
```

### Detaching blocks from agents

You can detach a block from an agent’s context window. This removes the block from the agent’s memory without deleting the block itself.

- [TypeScript](#tab-panel-70)
- [Python](#tab-panel-71)

```typescript
await client.agents.blocks.detach(agent.id, block.id);
```
