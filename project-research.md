# **Architectural Blueprint and Component Analysis for 3D Interactive Meeting Platforms**

## **Executive Summary**

The transition from linear, slide-based presentations to spatial, interactive 3D environments represents a fundamental paradigm shift in collaborative digital workspaces. The conceptualized platform, operating under the working title "SpacePresent," seeks to transform dense corporate and academic information into navigable 3D topologies, fundamentally altering how meeting participants interact with data. This conceptual shift demands a highly complex, multi-layered software architecture. Constructing such a system requires the integration of natural language processing (NLP) and knowledge graph extraction to parse source material, procedural generation algorithms to physically map that data, WebGL-based rendering via React Three Fiber (R3F) for visualization, low-latency WebRTC data channels for real-time multiplayer synchronization, and asynchronous AI agent pipelines for post-meeting summarization.

This comprehensive research report provides an exhaustive technical analysis of the libraries, public codebases, algorithms, and architectural patterns required to construct a 3D interactive meeting platform. By critically evaluating existing open-source ecosystems and procedural frameworks, this document outlines a robust blueprint for realizing the conceptual vision of SpacePresent. The analysis is structured across five core architectural domains: Document-to-Knowledge-Graph Ingestion, Procedural Metaphor Generation Algorithms, WebGL Rendering and Spatial Interface Mechanics, Real-Time Multiplayer Synchronization, and Asynchronous AI Post-Processing Pipelines.

## **Document Ingestion and Knowledge Graph Construction**

Before any information can be rendered within a three-dimensional spatial metaphor, the raw input data—ranging from PDF documents and slide decks to unstructured text and live transcripts—must be parsed, semantically structured, and mapped into a relational ontology. The transition from linear, flat documents to spatial entities requires advanced Knowledge Graph (KG) extraction pipelines capable of understanding both spatial layout and semantic meaning.

### **Spatial Data Extraction and Parsing**

To accurately map document hierarchies into a 3D space, the backend system must first comprehend the original physical and structural layout of the source material. The open-source Marker library (datalab-to/marker) serves as a critical reference architecture for this extraction process.1 Marker converts complex PDF documents into structured Markdown and JSON formats, utilizing the underlying Surya neural network model to detect page layouts, reading orders, and document structures.1

Crucially for a 3D spatial application, Marker's JSON output provides metadata containing precise polygon coordinates and bounding boxes (e.g., \[217.84, 80.63\]) for identified headings, paragraphs, and tables.1 These two-dimensional spatial coordinates serve as the foundational bedrock for 3D placement. By extracting these coordinates, the procedural generation engine can mathematically translate the 2D layout into 3D initial placement vectors, ensuring that the physical layout of the generated 3D world (such as a city or a factory) conceptually respects the original hierarchy and flow of the document. Furthermore, by leveraging the \--use\_llm flag within the Marker ecosystem, the pipeline can execute structured semantic extraction, intelligently merging related tables and text blocks across multiple pages into cohesive data nodes ready for 3D generation.1

### **Entity, Relationship, and Triplet Extraction**

Once the raw text is parsed and structurally organized, the system must identify discrete entities (which will become 3D nodes) and their relationships (which will become 3D edges or connectors). Open-source Python toolkits such as the Addepto/graph\_builder and stair-lab/kg-gen provide highly relevant foundational codebases for this process.2

The graph\_builder repository demonstrates how to extract structured knowledge from semi-structured data, operating as a Docker-ready FastAPI backend that parses tabular and contextual information into a retained graph state.2 This system relies heavily on the extraction of Subject-Predicate-Object (SPO) triplets.4 This specific code pattern is absolutely essential for the SpacePresent concept. For example, if a meeting transcript contains the phrase "Customer retention increased due to the Q3 marketing campaign," the NLP pipeline parses this into the SPO triplet \-\> (increased by) \-\> \[Q3 Marketing Campaign\]. In the subsequent 3D procedural engine, these SPO triplets dictate the generation of physical objects. The subjects and objects become distinct 3D structures (such as buildings in a city or planets in a galaxy), while the predicate defines the visual connection (such as a road, a bridge, or a gravitational orbit) between them. The kg-gen package further supplements this by utilizing Large Language Models (LLMs) to extract high-quality knowledge graphs from conversational text and raw transcripts, offering a mechanism to continually update the graph as the live meeting progresses.3

### **Temporal and Evolving Knowledge Graphs**

Because live meetings are dynamic events that unfold over time, static knowledge graphs are insufficient. The platform must track how decisions, metrics, and topics evolve over the course of a conversation. The getzep/graphiti framework introduces the critical concept of "temporal context graphs," which are uniquely suited for AI agents operating on evolving real-world data.5

Unlike traditional knowledge graphs that overwrite previous states, Graphiti's architecture tracks how facts change, attaching specific validity windows (timestamps) to each node and edge.5 By adopting a temporal graph architecture in the backend, the 3D frontend application can support asynchronous replay scrubbers. This allows users reviewing the meeting after the fact to "time travel" through the 3D space, observing exactly how the procedural city expanded or how the mind map branched out chronologically as different topics were introduced by the speakers during the meeting.5

## **Procedural Metaphor Generation Algorithms**

Once the backend has constructed a comprehensive, temporal knowledge graph, a Metaphor Mapping Engine must translate the abstract nodes, edges, and temporal data into a serializable 3D scene graph. This requires advanced algorithmic generation techniques adapted from video game development, procedural geometry, and big data visualization.

### **The Cityscape Metaphor Architecture**

The "City" metaphor translates top-level topics into distinct districts, supporting details into individual buildings, and relationships into interconnected roads. Procedural city generation typically relies on noise algorithms and geometric partitioning to allocate space logically without human intervention.

Repositories such as photonlines/Procedural-City-Generator provide a foundational understanding of using speed-optimized Perlin noise algorithms within Three.js to allocate city blocks and stack geometries based on numerical seeds.6 A more advanced, parameter-driven implementation is found in the MHillier98/IntroToComputerGraphics-CityGenerator codebase, which provides algorithmic variables for varying building sizes, thematic colors, and lighting aesthetics based on specific input constraints.7

However, for a data-visualization platform, pure random noise generation must be replaced with strictly data-driven procedural generation. An effective hybrid approach requires several distinct algorithmic steps:

1. **District Allocation:** The engine should utilize Voronoi partitioning algorithms to divide the flat 3D plane into distinct, non-overlapping geometric regions (districts).8 Each Voronoi cell corresponds to a top-level category identified by the LLM during the knowledge graph extraction phase.  
2. **Building Verticality and Scaling:** Instead of assigning random heights to the generated building meshes, verticality (the scale.y property in Three.js) must be mathematically bound to node centrality or reference frequency within the source text. This data-driven scaling technique is beautifully demonstrated in open-source GitHub visualization projects (such as honzaap/github-city), where a developer's repository commit counts directly dictate the physical height of the 3D buildings.9  
3. **Road Networks:** To visualize the edges of the knowledge graph, the engine must implement an L-system (Lindenmayer system) or an A\* pathfinding algorithm. This ensures that conceptually connected topics are linked by continuous, non-intersecting street meshes that navigate around the generated buildings.8

### **Force-Directed Topologies for Org Trees and Mind Maps**

For metaphors requiring organic clustering based on semantic similarity or hierarchical branching (such as the Org Tree and Mind Map), 3D force-directed graphs represent the industry standard. The vasturiano/r3f-forcegraph library, which serves as a React Three Fiber binding for the underlying 3d-force-graph engine, is highly recommended for this implementation.11

This library utilizes the robust d3-force-3d physics engine to calculate node positions iteratively. It simulates physical forces, applying Coulomb's law for repulsion between nodes to prevent overlap, and Hooke's law for spring forces along the edges to keep related concepts physically grouped together.12 It seamlessly integrates into an R3F \<Canvas\> component via the graphData prop, which accepts a serialized JSON structure directly from the backend knowledge graph.11

To customize this visualization engine for specific meeting metaphors, developers can leverage several advanced features:

* **Custom Geometries:** The nodeThreeObject and nodeThreeObjectExtend properties allow the engine to replace default primitive spheres with custom GLTF models or complex, interactive R3F component groupings (such as floating cards with text).12  
* **Directed Acyclic Graphs (DAG):** The library natively supports a DAG mode (e.g., dagMode="td" for top-down or "radialout" for outward expansion). This algorithmic mode automatically enforces a strict hierarchical tree structure, overriding the standard spring physics to force parent nodes physically above or central to child nodes. This exact algorithm is required to autonomously generate the "Org Tree" metaphor from unstructured meeting data.11  
* **Edge Particle Animation:** The library natively supports linkDirectionalParticles. This allows the platform to emit moving light particles that travel along the connections between nodes.11 In the context of the "Factory" metaphor, this visual effect perfectly represents the flow of materials or data between different processing stations.

| Metaphor Requirement | Optimal Algorithmic Approach | Recommended Reference Library |
| :---- | :---- | :---- |
| **City** | Voronoi Partitioning, A\* Pathfinding, Data-driven Extrusion | photonlines/Procedural-City-Generator 6 |
| **Org Tree / Mind Map** | 3D Force-Directed Graph, Barnes-Hut Approximation, DAG Layouts | vasturiano/r3f-forcegraph 11 |
| **Timeline River** | Catmull-Rom Splines, Flowmaps, Temporal Interpolation | mrdoob/three.js (Water2 shader) 14 |
| **Galaxy** | Orbit Mechanics, Trigonometric Offsets, GLSL Particle Shaders | sugaith/react-three-fiber-shader-galaxy 15 |

### **Solar System and Galaxy Metaphor Mechanics**

The Galaxy metaphor maps central meeting themes to suns, subtopics to orbiting planets, and granular details to moons. Constructing this procedural layout requires an understanding of orbital mechanics mathematics and WebGL particle shaders to maintain high framerates.

Codebases such as sugaith/react-three-fiber-shader-galaxy provide excellent boilerplates for procedurally generated particle systems using GLSL vertex and fragment shaders integrated directly via Webpack configurations.15 To build the specific planetary hierarchies without complex trigonometry on every frame, the architecture should mimic the object-nesting patterns found in the yudhanjaya/Starmap project.16

In this pattern, generated data is mapped to visual properties using nested THREE.Object3D groups to calculate local versus global rotations.16 A parent, invisible Object3D acts as the pivot center (located at the sun's position), while the child mesh (the planet) is attached to this parent but offset by a specified X/Z radius. By simply rotating the invisible parent object on its Y-axis within the rendering loop, the child planet inherently follows a perfect orbital path. This dramatically reduces the CPU overhead compared to calculating sine and cosine positions for every celestial body on every single frame.17

### **The Timeline River Metaphor**

Representing chronological events requires plotting 3D meshes along a continuous, meandering path rather than clustering them. The andrewisen-tikab/three-timeline repository demonstrates how to bind specific THREE.Object3D positional properties to chronological dates, allowing objects to automatically interpolate their physical positions based on a simulated, moving timeline.18

To render the visual river itself, the platform should leverage WebGL flowmap implementations rather than static textures. The core Three.js repository contains a highly optimized Water2.js shader object that utilizes normal maps and pre-calculated flow maps to simulate realistic, moving fluid dynamics.14 By generating a continuous Catmull-Rom spline (THREE.CatmullRomCurve3) that intersects the chronologically sorted knowledge graph nodes, the procedural engine can extrude a riverbed geometry along that path. Applying the Water2 shader to this extruded geometry creates a winding river where the directional flow of the water texture inherently represents the linear passage of time during the meeting.14

## **WebGL Rendering, Spatial Interfaces, and D3 Integration**

Operating effectively within a 3D meeting space requires highly intuitive camera navigation and the ability for users to seamlessly interact with complex, dense data (such as charts, text summaries, and embedded media) without leaving the WebGL context. The frontend stack relies heavily on React Three Fiber to bridge standard declarative UI states with imperative WebGL rendering loops.20

### **Advanced Camera Interpolation and Control Systems**

Standard orbit controls are entirely insufficient for a platform where natural language voice queries (e.g., "Show me the Q3 revenue drop") must trigger smooth, cinematic flights across a massive 3D landscape.

The camera-controls library (yomotsu/camera-controls) provides the complex mathematical foundation required for these smooth transitions.22 Unlike standard Three.js controls that mutate the camera directly and disrupt React's state management, this library handles precise azimuth, polar, and dolly calculations internally.23

* **Fly-to Animation Logistics:** The library provides the powerful setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition) method. When the enableTransition flag is set to true, the camera automatically and smoothly interpolates from its current physical location to the newly specified coordinates.22  
* **Transition Easing:** The smoothness of this flight is controlled via the .smoothTime property (which defaults to 0.25 seconds). This property applies a spring-physics-based dampening curve to the camera movement, preventing the jarring, instantaneous cuts that cause simulation sickness or user disorientation.22  
* **Implementation Pattern:** Within the React Three Fiber ecosystem, this is implemented inside the useFrame hook, continuously calling cameraControls.update(delta) to recalculate the easing math on every single frame based on the clock delta.22

Alternatively, for complex, highly scripted guided tours where the host orchestrates a specific path through the data, the @theatre/core and @theatre/r3f libraries offer professional motion design toolsets.25 Theatre.js allows developers to animate the camera along complex predefined Bezier splines, automatically handling the quaternion interpolation required to prevent "gimbal lock" during complex 3D rotations.25

### **Spatial User Interfaces and Typography Rendering**

Displaying highly legible text and interactive detail panels inside a 3D scene is a historically notorious WebGL bottleneck. Relying on CSS and HTML overlays (such as the \<Html\> component from @react-three/drei) frequently causes severe z-indexing issues. In these scenarios, HTML elements float incorrectly over foreground 3D objects, ruining the spatial immersion and breaking depth perception.26

The optimal architectural solution is the three-mesh-ui library (felixmariotto/three-mesh-ui).28 This library constructs user interface layouts natively within the WebGL context using CSS Flexbox-like principles, utilizing Block containers and Text child elements.28

* **Text Rendering Mechanics:** The library achieves crisp typography by utilizing Multi-channel Signed Distance Fields (MSDF) for fonts. Unlike standard texture mapping, MSDF uses a specialized texture map (.png) alongside a coordinate file (.json) to calculate the distance to the edge of a character on the GPU.28 This allows the shader to render perfectly crisp, anti-aliased text at any camera distance or scale.28 This is absolutely critical for reading dense meeting notes or numeric metrics attached to the side of a distant 3D building without pixelation.  
* **Native Interactivity:** Because these UI elements are standard THREE.Object3D instances, they natively support WebGL Raycasting. When a user clicks a 3D building in the city metaphor, a ThreeMeshUI.Block containing the drill-down data can smoothly scale and animate into existence, physically attached to the building's geometry in the 3D space.28

### **Integrating Interactive D3.js Data Visualizations**

When a user triggers a drill-down event into an object, the platform must display complex, interactive charts (bar, line, pie, scatter). While D3.js is the industry standard for data visualization, it typically manipulates the Document Object Model (DOM) by generating SVG elements. Attempting to render thousands of DOM-based SVG nodes over a 3D canvas introduces severe performance degradation.29

The architectural solution treats D3.js purely as a mathematics and layout engine, divorcing its calculations from its standard rendering pipeline.30 D3 is responsible for calculating the scales, axis ticks, and geometric paths (e.g., the exact arc angles for a pie chart or the normalized heights for a bar chart). Instead of rendering these to the DOM, the numerical outputs are passed directly to React Three Fiber.

* **Data to 3D Geometry:** Open-source libraries like d3-x3d or d3-3d demonstrate this integration pattern perfectly.32 A D3 bar chart layout function outputs a structured array of x/y/z positions and dimensions. React Three Fiber then maps this array to a \<instancedMesh\>. Instancing allows the engine to render thousands of 3D bars or scatter plot points in a single GPU draw call, vastly outperforming DOM-based rendering.27  
* **Canvas Texture Mapping for 2D Charts:** For complex 2D charts that do not inherently require 3D depth but must exist in the 3D space, the application can instruct D3 to draw directly to an off-screen HTML5 \<canvas\> element.29 This canvas is then utilized as a THREE.CanvasTexture and applied as a material to a ThreeMeshUI plane.26 This approach allows standard, highly complex D3 codebases to be reused entirely while keeping the visual output strictly constrained within the immersive WebGL scene.

## **Real-Time Multiplayer Synchronization**

For SpacePresent to function effectively as a collaborative meeting platform, remote participants must occupy the same synchronized 3D space. This requires tracking continuous user presence, synchronizing 3D cursors and avatars, and ensuring that specific camera movements (especially in the "Guided Tour" mode) are broadcast globally with minimal latency.

### **Networking Infrastructure: WebRTC versus WebSockets**

The choice of the underlying networking transport layer fundamentally dictates the performance, scalability, and responsiveness of the multiplayer experience.

**The WebSocket Approach (Socket.io):** Many existing open-source WebGL multiplayer repositories, such as THREE.Multiplayer and the socketio-react-three-fiber-tutorial, utilize Node.js and Socket.io.35 In this traditional architecture, an authoritative server receives XYZ coordinates and quaternion rotations from individual clients at a fixed tick rate (e.g., 30 ticks per second). The server aggregates this data and broadcasts a consolidated state object back to all connected clients.37 While conceptually simple and easy to implement, WebSockets rely on the TCP protocol. TCP guarantees packet delivery, which introduces "head-of-line blocking." If a single packet containing a cursor movement is dropped due to network instability, all subsequent packets are delayed until the lost packet is retransmitted. In a fast-paced 3D environment, this causes highly visible stuttering and rubber-banding in cursor and avatar movements.37

**The WebRTC Data Channel Approach (LiveKit):** A significantly superior architecture for real-time spatial applications involves WebRTC, specifically managed through robust infrastructure platforms like LiveKit.39 While LiveKit is fundamentally designed for ultra-low-latency audio and video media routing, its Data Channels provide UDP-based transmission for application state.40 Because the UDP protocol does not require packet receipt acknowledgment, continuous data streams (like rapid cursor coordinates or camera look-vectors) are never blocked by dropped packets.

The livekit-examples repository provides essential templates (such as agent-starter-react and livepaint) demonstrating how to establish rooms and synchronize arbitrary application state across decentralized clients in under 50 milliseconds.41 Utilizing LiveKit ensures that the visual collaboration layer scales effortlessly to support dozens of meeting participants without overwhelming a single Node.js instance.

### **Interpolation and Perceived Zero-Latency Mechanics**

Regardless of the chosen transport layer, transmitting spatial data at a full 60 frames per second over a network will rapidly overwhelm both the server and the client bandwidth, resulting in jitter. The architecture must implement intelligent data decimation combined with sophisticated client-side interpolation.42

The genmon/interconnected-cursor-party codebase highlights highly effective synchronization techniques for collaborative cursors.43 Instead of sending every single mouse movement, the client decimates the data, sampling the cursor position only at 100-millisecond intervals.42

* **Vector Payload Construction:** To compensate for the reduced transmission rate, the data payload must include not just the current XYZ position, but also the velocity vector (direction and speed) and an exact timestamp.42  
* **Client-Side Prediction (Dead Reckoning):** The receiving clients utilize Three.js vector mathematics to dynamically construct a Bezier curve or Catmull-Rom spline between the received spatial points. The engine then animates the remote cursor along that generated curve locally, resulting in visually flawless movement.42 If the network experiences lag and a packet is delayed, the system utilizes the previously transmitted velocity vector to predict where the cursor *should* be, continuing the animation smoothly. When the delayed packet finally arrives, the engine calculates a smooth Hermite curve to correct the position without jarring teleports.37

### **Interactive Shaders and Spatial Annotations**

To elevate the visual fidelity of multiplayer interactions and make annotations feel tangible, WebGL fragment shaders can be utilized to generate dynamic cursor trails and spatial highlights. Inspired by rendering techniques discussed in advanced Three.js development forums, rendering mouse input and velocity to an off-screen WebGLRenderTarget allows the creation of a 2D distance field.45

By programmatically mixing the previous frame's slightly blurred, low-resolution result with the current frame's velocity vector, the engine generates highly fluid, trailing visual distortions.45 This simulates effects like a volumetric laser pointer slicing through the 3D air or a smoke trail following a presenter's cursor in 3D space, achieved at a remarkably low computational cost that easily maintains high framerates on standard hardware.45

## **Asynchronous AI Post-Processing Pipelines**

The secondary, yet highly critical, value proposition of the SpacePresent platform is its ability to act as an autonomous, intelligent scribe. When a spatial meeting concludes, the system must independently trigger a complex NLP pipeline to clean the raw transcript, extract actionable summaries, generate slides, and synthesize a polished audio recap. This replicates and expands upon the functionality of tools like Google's NotebookLM.

### **Real-Time Audio Capture and Transcription Routing**

Capturing high-fidelity audio streams and routing them for accurate transcription is the first mandatory phase of the post-processing pipeline. The VoiceTeam-ElevenLabsHackathon5 repository provides a highly functional, battle-tested architectural blueprint for integrating React WebGL frontends with low-latency Speech-to-Text (STT) APIs.46

The system architecture utilizes a persistent WebSocket connection to stream raw audio buffers continuously from the browser's MediaRecorder API directly to the processing endpoint.46 In a professional enterprise environment, providers like AssemblyAI or Deepgram offer robust word-level diarization (which accurately separates and attributes speech to different individuals).47 However, ElevenLabs' Scribe v2 API provides an optimized real-time STT model that explicitly supports multichannel stereophonic separation.46 This is highly effective for multi-caller environments where overlapping speech frequently breaks traditional transcription models.

* **Virtual Audio Routing Mechanisms:** A critical, often overlooked insight derived from the VoiceTeam architecture is the absolute necessity for virtual audio devices (such as BlackHole on macOS, VB-CABLE on Windows, or PipeWire on Linux).46 Because browser-based applications cannot natively register as system-level microphones, these virtual bridges are required to route the synthesized AI voice responses back into the live meeting stream (e.g., Zoom or Teams) without causing destructive acoustic feedback loops.46

### **Pipeline Orchestration and Multi-Agent Frameworks**

Once the raw transcript is finalized and diarized at the end of the meeting, it must be passed through a Large Language Model for structured summarization. The open-source pipecat-ai/pipecat Python framework represents the current cutting edge in conversational AI orchestration.48 Pipecat allows developers to compose complex, multi-agent workflows that seamlessly connect WebRTC media inputs, LLM inference engines (like OpenAI, Gemini, or Anthropic), and Text-to-Speech (TTS) outputs within a unified event loop.48

An effective implementation pattern, observed in repositories such as inboxpraveen/LLM-Minutes-of-Meeting and CloudAIEngineer/auto-meeting-summary, relies heavily on event-driven serverless architectures 47:

1. **Webhook Triggering:** Upon the explicit conclusion of the LiveKit room session, a webhook (application/webhook+json) is automatically fired to the Python backend infrastructure.39  
2. **Inference Execution and Extraction:** The complete meeting transcript is parsed by the designated LLM. The LLM must be configured with a strict system prompt and structured JSON schema validation to guarantee the extraction of exactly 5 key bullet points, specific action items, and named entities.47 Note that while the initial concept requested the NotebookLM API, an official, public API for NotebookLM does not currently exist for external developers.50 The architecture must pivot to utilizing Google's Gemini Pro model directly, or rely on third-party wrapper APIs, to achieve the exact same context-extraction capabilities.50  
3. **Automated Content Repurposing:** Inspired by automated content factories and n8n workflow architectures, the generated JSON text is simultaneously pushed to a markdown-to-slide generator.51 This automates the construction of the requested 6-slide "Mini-Deck" without any human intervention.

### **Neural Audio Recap Generation and Delivery**

To generate the final "Audio Recap" (the synthesized, 2-minute podcast-like summary of the meeting), the platform utilizes ElevenLabs' advanced Text-to-Speech (TTS) neural models. The backend architecture for this process must handle network latency and state management carefully to ensure rapid delivery.

* **Chunked Processing Logistics:** Rather than waiting for the entire audio file to generate, the backend splits the LLM-generated summary text into distinct sentences. The TTS API processes these semantic chunks asynchronously and streams the base64-encoded audio data back to the client or storage bucket sequentially.46  
* **Voice Persona Consistency:** The API calls must specify a fixed, predefined Voice ID (e.g., SAz9YHcvj6GT2YYXdXww) to maintain the consistent persona of the AI scribe across all corporate meetings, enhancing user familiarity.46  
* **Storage and Notification:** The final compiled audio file, alongside the generated slides and summary cards, is uploaded to an AWS S3 bucket.49 The central database record for the specific meeting is subsequently updated with the pre-signed URLs. A WebSocket event or push notification is then broadcast to the meeting host's client, indicating that the generative artifacts are ready for review and sharing.

## **Strategic Implementation and Technical Synthesis**

The realization of the "SpacePresent" platform is technically feasible within a constrained development timeline, provided the engineering effort strictly adheres to the architectural patterns identified in this research. Attempting to build proprietary 3D physics engines or custom WebRTC signaling servers from scratch will result in severe scope creep.

**Phased Implementation Strategy:**

1. **The Metaphor Engine:** Developers must avoid writing procedural generation algorithms entirely from scratch. Utilizing @react-three/drei provides the necessary boilerplate scaffolding. Adopting the vasturiano/r3f-forcegraph library handles the complex mathematical heavy lifting of 3D node positioning and collision detection, immediately satisfying the core requirements for the Org Tree and Mind Map metaphors.11  
2. **Spatial User Interfaces:** The development team must discard traditional HTML DOM overlays for in-world text. Implementing three-mesh-ui immediately ensures that dense text, tooltips, and D3.js charts scale correctly and remain legible within the WebGL context, preserving high framerates and preventing z-index clipping.28  
3. **Multiplayer Synchronization:** Bypass standard Socket.io implementations and integrate LiveKit's React component ecosystem (@livekit/react-core).52 Utilizing WebRTC Data Channels for cursor XYZ synchronization, while applying 100ms vector interpolation buffering, effectively masks network latency and ensures buttery-smooth avatar movements.40  
4. **The AI Pipeline:** Isolate the entire NLP and audio generation pipeline to a serverless backend. Utilizing the Pipecat framework or robust webhook workflows handles the sequential execution of STT (Deepgram/ElevenLabs), LLM summarization (Gemini), and TTS audio generation (ElevenLabs) reliably and asynchronously.47

By intelligently layering these established, high-performance open-source technologies—React Three Fiber for declarative WebGL rendering, LiveKit for low-latency UDP state sharing, and modular AI frameworks for asynchronous content generation—the platform can successfully break the linear slide paradigm. This architecture ensures that dense corporate data is transformed into intuitive, navigable, and highly collaborative spatial environments.

#### **Works cited**

1. datalab-to/marker: Convert PDF to markdown \+ JSON ... \- GitHub, accessed April 25, 2026, [https://github.com/datalab-to/marker](https://github.com/datalab-to/marker)  
2. GitHub \- Addepto/graph\_builder: Open-source toolkit to extract structured knowledge graphs from documents and tables — power analytics, digital twins, and AI-driven assistants., accessed April 25, 2026, [https://github.com/Addepto/graph\_builder](https://github.com/Addepto/graph_builder)  
3. stair-lab/kg-gen: \[NeurIPS '25\] Knowledge Graph Generation from Any Text \- GitHub, accessed April 25, 2026, [https://github.com/stair-lab/kg-gen](https://github.com/stair-lab/kg-gen)  
4. robert-mcdermott/ai-knowledge-graph: AI Powered Knowledge Graph Generator \- GitHub, accessed April 25, 2026, [https://github.com/robert-mcdermott/ai-knowledge-graph](https://github.com/robert-mcdermott/ai-knowledge-graph)  
5. GitHub \- getzep/graphiti: Build Real-Time Knowledge Graphs for AI Agents, accessed April 25, 2026, [https://github.com/getzep/graphiti](https://github.com/getzep/graphiti)  
6. photonlines/Procedural-City-Generator: Procedural city / city block generator built using THREE.js. \- GitHub, accessed April 25, 2026, [https://github.com/photonlines/Procedural-City-Generator](https://github.com/photonlines/Procedural-City-Generator)  
7. MHillier98/IntroToComputerGraphics-CityGenerator: A Procedural City Generator built in Three.js \- GitHub, accessed April 25, 2026, [https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator](https://github.com/MHillier98/IntroToComputerGraphics-CityGenerator)  
8. GitHub \- Grzybojad/ProceduralCityGeneration: Implementations of several procedural generation methods used to generate a virtual city. Written in C++ for use in Unreal Engine., accessed April 25, 2026, [https://github.com/Grzybojad/ProceduralCityGeneration](https://github.com/Grzybojad/ProceduralCityGeneration)  
9. Generating a city from your Github contributions \- Showcase \- three.js forum, accessed April 25, 2026, [https://discourse.threejs.org/t/github-city-generating-a-city-from-your-github-contributions/53436](https://discourse.threejs.org/t/github-city-generating-a-city-from-your-github-contributions/53436)  
10. 3D pixel art city built with React Three Fiber. every building is a real GitHub developer. almost 10k buildings rendered. : r/threejs \- Reddit, accessed April 25, 2026, [https://www.reddit.com/r/threejs/comments/1rhg5n3/3d\_pixel\_art\_city\_built\_with\_react\_three\_fiber/](https://www.reddit.com/r/threejs/comments/1rhg5n3/3d_pixel_art_city_built_with_react_three_fiber/)  
11. vasturiano/r3f-forcegraph: Force-directed graph as a React Three Fiber component \- GitHub, accessed April 25, 2026, [https://github.com/vasturiano/r3f-forcegraph](https://github.com/vasturiano/r3f-forcegraph)  
12. 3D force-directed graph component using ThreeJS/WebGL \- GitHub, accessed April 25, 2026, [https://github.com/vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph)  
13. GitHub \- vasturiano/react-force-graph: React component for 2D, 3D, VR and AR force directed graphs, accessed April 25, 2026, [https://github.com/vasturiano/react-force-graph](https://github.com/vasturiano/react-force-graph)  
14. 24b How to make a river three.js \- YouTube, accessed April 25, 2026, [https://www.youtube.com/watch?v=FT1O2G55yS8](https://www.youtube.com/watch?v=FT1O2G55yS8)  
15. sugaith/react-three-fiber-shader-galaxy \- GitHub, accessed April 25, 2026, [https://github.com/sugaith/react-three-fiber-shader-galaxy](https://github.com/sugaith/react-three-fiber-shader-galaxy)  
16. GitHub \- yudhanjaya/Starmap: Simple galaxy generator logic. Designed for storytelling purposes: generates stars, planets, properties for each, and adds civilizations that expand their territory., accessed April 25, 2026, [https://github.com/yudhanjaya/Starmap](https://github.com/yudhanjaya/Starmap)  
17. 3D Galaxy Visualisation Website Built using Three.JS Components. \- GitHub, accessed April 25, 2026, [https://github.com/08mfp/Galaxy-Visualisation-Website](https://github.com/08mfp/Galaxy-Visualisation-Website)  
18. andrewisen-tikab/three-timeline: Adds an extra dimension, time, to regular three.js objects \- GitHub, accessed April 25, 2026, [https://github.com/andrewisen-tikab/three-timeline](https://github.com/andrewisen-tikab/three-timeline)  
19. three.js docs, accessed April 25, 2026, [https://threejs.org/docs/](https://threejs.org/docs/)  
20. Introduction \- React Three Fiber, accessed April 25, 2026, [https://r3f.docs.pmnd.rs/getting-started/introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)  
21. pmndrs/react-three-fiber: A React renderer for Three.js \- GitHub, accessed April 25, 2026, [https://github.com/pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)  
22. yomotsu/camera-controls: A camera control for three.js ... \- GitHub, accessed April 25, 2026, [https://github.com/yomotsu/camera-controls](https://github.com/yomotsu/camera-controls)  
23. Dynamically set Camera position after model loaded in React three fiber \#412 \- GitHub, accessed April 25, 2026, [https://github.com/pmndrs/react-three-fiber/discussions/412](https://github.com/pmndrs/react-three-fiber/discussions/412)  
24. Camera Controls \- Wawa Sensei, accessed April 25, 2026, [https://wawasensei.dev/courses/react-three-fiber/lessons/camera-controls](https://wawasensei.dev/courses/react-three-fiber/lessons/camera-controls)  
25. Animate a Camera Fly-through on Scroll Using Theatre.js and React Three Fiber | Codrops, accessed April 25, 2026, [https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/](https://tympanus.net/codrops/2023/02/14/animate-a-camera-fly-through-on-scroll-using-theatre-js-and-react-three-fiber/)  
26. React component on plane as hud (react-three-fiber) \- Questions \- three.js forum, accessed April 25, 2026, [https://discourse.threejs.org/t/react-component-on-plane-as-hud-react-three-fiber/30092](https://discourse.threejs.org/t/react-component-on-plane-as-hud-react-three-fiber/30092)  
27. Building 3-D Web Experiences With react-three-fiber | Nearform, accessed April 25, 2026, [https://nearform.com/digital-community/react-three-fiber/](https://nearform.com/digital-community/react-three-fiber/)  
28. felixmariotto/three-mesh-ui: Make VR user interfaces for Three.js \- GitHub, accessed April 25, 2026, [https://github.com/felixmariotto/three-mesh-ui](https://github.com/felixmariotto/three-mesh-ui)  
29. D3 and Canvas in 3 steps. The bind, the draw and the… | by lars verspohl | We've moved to freeCodeCamp.org/news | Medium, accessed April 25, 2026, [https://medium.com/free-code-camp/d3-and-canvas-in-3-steps-8505c8b27444](https://medium.com/free-code-camp/d3-and-canvas-in-3-steps-8505c8b27444)  
30. D3 by Observable | The JavaScript library for bespoke data visualization, accessed April 25, 2026, [https://d3js.org/](https://d3js.org/)  
31. A 2D/ 3D graphing engine powered by Three.js as an alternative to D3.js \- Questions, accessed April 25, 2026, [https://discourse.threejs.org/t/a-2d-3d-graphing-engine-powered-by-three-js-as-an-alternative-to-d3-js/80541](https://discourse.threejs.org/t/a-2d-3d-graphing-engine-powered-by-three-js-as-an-alternative-to-d3-js/80541)  
32. jamesleesaunders/d3-x3d: 3D Data Driven Charting Library with D3 and X3D \- GitHub, accessed April 25, 2026, [https://github.com/jamesleesaunders/d3-x3d](https://github.com/jamesleesaunders/d3-x3d)  
33. Niekes/d3-3d \- GitHub, accessed April 25, 2026, [https://github.com/Niekes/d3-3d](https://github.com/Niekes/d3-3d)  
34. 3D MindMap : r/threejs \- Reddit, accessed April 25, 2026, [https://www.reddit.com/r/threejs/comments/1nd9uu7/3d\_mindmap/](https://www.reddit.com/r/threejs/comments/1nd9uu7/3d_mindmap/)  
35. ‍♂️ A boilerplate server and client setup for Three.js multiplayer using Socket.io \- GitHub, accessed April 25, 2026, [https://github.com/juniorxsound/THREE.Multiplayer](https://github.com/juniorxsound/THREE.Multiplayer)  
36. Simple tutorial to Socket.io and to react three fiber with detailed implementation in my blog site \- GitHub, accessed April 25, 2026, [https://github.com/balazsfaragodev/socketio-react-three-fiber-tutorial](https://github.com/balazsfaragodev/socketio-react-three-fiber-tutorial)  
37. How to set up correctly my multiplayer \- Questions \- three.js forum, accessed April 25, 2026, [https://discourse.threejs.org/t/how-to-set-up-correctly-my-multiplayer/59662](https://discourse.threejs.org/t/how-to-set-up-correctly-my-multiplayer/59662)  
38. three.js socket.io multiplayer system \- javascript \- Stack Overflow, accessed April 25, 2026, [https://stackoverflow.com/questions/45652502/three-js-socket-io-multiplayer-system](https://stackoverflow.com/questions/45652502/three-js-socket-io-multiplayer-system)  
39. Webhooks & events \- LiveKit Documentation, accessed April 25, 2026, [https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/)  
40. Realtime media and data \- LiveKit Documentation, accessed April 25, 2026, [https://docs.livekit.io/frontends/build/media-data/](https://docs.livekit.io/frontends/build/media-data/)  
41. LiveKit Examples \- GitHub, accessed April 25, 2026, [https://github.com/livekit-examples](https://github.com/livekit-examples)  
42. How to Animate Multiplayer Cursors \- Hacker News, accessed April 25, 2026, [https://news.ycombinator.com/item?id=31987713](https://news.ycombinator.com/item?id=31987713)  
43. README.md \- threepointone/interconnected-cursor-party \- GitHub, accessed April 25, 2026, [https://github.com/threepointone/interconnected-cursor-party/blob/main/README.md](https://github.com/threepointone/interconnected-cursor-party/blob/main/README.md)  
44. PartyKit Cursor Party fork for interconnected.org \- GitHub, accessed April 25, 2026, [https://github.com/genmon/interconnected-cursor-party](https://github.com/genmon/interconnected-cursor-party)  
45. How to create a cursor animation like in Lusion.co WebGL ( three.js ) : r/threejs \- Reddit, accessed April 25, 2026, [https://www.reddit.com/r/threejs/comments/1fzr6vf/how\_to\_create\_a\_cursor\_animation\_like\_in\_lusionco/](https://www.reddit.com/r/threejs/comments/1fzr6vf/how_to_create_a_cursor_animation_like_in_lusionco/)  
46. GitHub \- Tody23/VoiceTeam-ElevenLabsHackathon5: Local-first AI meeting assistant for ElevenLabs Hack \#5: listens to meeting context, drafts live answers with specialist guidance, and speaks approved responses using ElevenLabs voice., accessed April 25, 2026, [https://github.com/Tody23/VoiceTeam-ElevenLabsHackathon5](https://github.com/Tody23/VoiceTeam-ElevenLabsHackathon5)  
47. inboxpraveen/LLM-Minutes-of-Meeting \- GitHub, accessed April 25, 2026, [https://github.com/inboxpraveen/LLM-Minutes-of-Meeting](https://github.com/inboxpraveen/LLM-Minutes-of-Meeting)  
48. pipecat-ai/pipecat: Open Source framework for voice and multimodal conversational AI \- GitHub, accessed April 25, 2026, [https://github.com/pipecat-ai/pipecat](https://github.com/pipecat-ai/pipecat)  
49. CloudAIEngineer/auto-meeting-summary: This project automates the transcription and summarization of meeting audio or video files using AWS Lambda, AWS Transcribe, and an LLM, posting the results to Confluence. \- GitHub, accessed April 25, 2026, [https://github.com/CloudAIEngineer/auto-meeting-summary](https://github.com/CloudAIEngineer/auto-meeting-summary)  
50. NotebookLM API Alternative for Developers, accessed April 25, 2026, [https://autocontentapi.com/notebooklm-api](https://autocontentapi.com/notebooklm-api)  
51. The Recap AI \+ AI Automation Mastery n8n Workflows, Templates, and Agents \- GitHub, accessed April 25, 2026, [https://github.com/lucaswalter/n8n-ai-automations](https://github.com/lucaswalter/n8n-ai-automations)  
52. React Core and Components \- LiveKit, accessed April 25, 2026, [https://livekit.com/blog/react-core-components](https://livekit.com/blog/react-core-components)