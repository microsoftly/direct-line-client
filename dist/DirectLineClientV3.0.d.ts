/// <reference types="request" />
/// <reference types="bluebird" />
/// <reference types="node" />
/**
 * Bot Connector - Direct Line API - v3.0
 * Direct Line 3.0  ===============      The Direct Line API is a simple REST API for connecting directly to a single bot. This API is intended for developers  writing their own client applications, web chat controls, mobile apps, or service-to-service applications that will  talk to their bot.    Within the Direct Line API, you will find:    * An **authentication mechanism** using standard secret/token patterns  * The ability to **send** messages from your client to your bot via an HTTP POST message  * The ability to **receive** messages by **WebSocket** stream, if you choose  * The ability to **receive** messages by **polling HTTP GET**, if you choose  * A stable **schema**, even if your bot changes its protocol version    Direct Line 1.1 and 3.0 are both available and supported. This document describes Direct Line 3.0. For information  on Direct Line 1.1, visit the [Direct Line 1.1 reference documentation](/en-us/restapi/directline/).    # Authentication: Secrets and Tokens    Direct Line allows you to authenticate all calls with either a secret (retrieved from the Direct Line channel  configuration page) or a token (which you may get at runtime by converting your secret).    A Direct Line **secret** is a master key that can access any conversation, and create tokens. Secrets do not expire.    A Direct Line **token** is a key for a single conversation. It expires but can be refreshed.    If you're writing a service-to-service application, using the secret may be simplest. If you're writing an application  where the client runs in a web browser or mobile app, you may want to exchange your secret for a token, which only  works for a single conversation and will expire unless refreshed. You choose which security model works best for you.    Your secret or token is communicated in the ```Authorization``` header of every call, with the Bearer scheme.  Example below.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/activities HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  [other HTTP headers, omitted]  ```    You may notice that your Direct Line client credentials are different from your bot's credentials. This is  intentional, and it allows you to revise your keys independently and lets you share client tokens without  disclosing your bot's password.     ## Exchanging a secret for a token    This operation is optional. Use this step if you want to prevent clients from accessing conversations they aren't  participating in.    To exchange a secret for a token, POST to /v3/directline/tokens/generate with your secret in the auth header  and no HTTP body.    ```  -- connect to directline.botframework.com --  POST /v3/directline/tokens/generate HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"conversationId\": \"abc123\",    \"token\": \"RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn\",    \"expires_in\": 1800  }  ```    If successful, the response is a token suitable for one conversation. The token expires in the seconds  indicated in the ```expires_in``` field (30 minutes in the example above) and must be refreshed before then to  remain useful.    This call is similar to ```/v3/directline/conversations```. The difference is that the call to  ```/v3/directline/tokens/generate``` does not start the conversation, does not contact the bot, and does not  create a streaming WebSocket URL.  * Call ```/v3/directline/conversations``` if you will distribute the token to client(s) and want them to     initiate the conversation.  * Call ```/v3/directline/conversations``` if you intend to start the conversation immediately.      ## Refreshing a token    A token may be refreshed an unlimited number of times unless it is expired.    To refresh a token, POST to /v3/directline/tokens/refresh. This method is valid only for unexpired tokens.    ```  -- connect to directline.botframework.com --  POST /v3/directline/tokens/refresh HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"conversationId\": \"abc123\",    \"token\": \"RCurR_XV9ZA.cwA.BKA.y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xniaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0\",    \"expires_in\": 1800  }  ```       # REST calls for a Direct Line conversation    Direct Line conversations are explicitly opened by clients and may run as long as the bot and client participate  (and have valid credentials). While the conversation is open, the bot and client may both send messages. More than  one client may connect to a given conversation and each client may participate on behalf of multiple users.    ## Starting a conversation    Clients begin by explicitly starting a conversation. If successful, the Direct Line service replies with a  JSON object containing a conversation ID, a token, and a WebSocket URL that may be used later.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 201 Created  [other headers]    {    \"conversationId\": \"abc123\",    \"token\": \"RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn\",    \"expires_in\": 1800,    \"streamUrl\": \"https://directline.botframework.com/v3/directline/conversations/abc123/stream?t=RCurR_XV9ZA.cwA...\"  }  ```    If the conversation was started, an HTTP 201 status code is returned. HTTP 201 is the code that clients  will receive under most circumstances, as the typical use case is for a client to start a new conversation.  Under certain conditions -- specifically, when the client has a token scoped to a single conversation AND  when that conversation was started with a prior call to this URL -- this method will return HTTP 200 to signify  the request was acceptable but that no conversation was created (as it already existed).    You have 60 seconds to connect to the WebSocket URL. If the connection cannot be established during this time,  use the reconnect method below to generate a new stream URL.    This call is similar to ```/v3/directline/tokens/generate```. The difference is that the call to  ```/v3/directline/conversations``` starts the conversation, contacts the bot, and creates a streaming WebSocket  URL, none of which occur when generating a token.  * Call ```/v3/directline/conversations``` if you will distribute the token to client(s) and want them to    initiate the conversation.  * Call ```/v3/directline/conversations``` if you intend to start the conversation immediately.    ## Reconnecting to a conversation    If a client is using the WebSocket interface to receive messages but loses its connection, it may need to reconnect.  Reconnecting requires generating a new WebSocket stream URL, and this can be accomplished by sending a GET request  to the ```/v3/directline/conversations/{id}``` endpoint.    The ```watermark``` parameter is optional. If supplied, the conversation replays from the watermark,  guaranteeing no messages are lost. If ```watermark``` is omitted, only messages received after the reconnection  call (```GET /v3/directline/conversations/abc123```) are replayed.    ```  -- connect to directline.botframework.com --  GET /v3/directline/conversations/abc123?watermark=0000a-42 HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"conversationId\": \"abc123\",    \"token\": \"RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0y8qbOF5xPGfiCpg4Fv0y8qqbOF5x8qbOF5xn\",    \"streamUrl\": \"https://directline.botframework.com/v3/directline/conversations/abc123/stream?watermark=000a-4&t=RCurR_XV9ZA.cwA...\"  }  ```    You have 60 seconds to connect to the WebSocket stream URL. If the connection cannot be established during this  time, issue another reconnect request to get an updated stream URL.    ## Sending an Activity to the bot    Using the Direct Line 3.0 protocol, clients and bots may exchange many different Bot Framework v3 Activites,  including Message Activities, Typing Activities, and custom activities that the bot supports.    To send any one of these activities to the bot,    1. the client formulates the Activity according to the Activity schema (see below)  2. the client issues a POST message to ```/v3/directline/conversations/{id}/activities```  3. the service returns when the activity was delivered to the bot, with an HTTP status code reflecting the     bot's status code. If the POST was successful, the service returns a JSON payload containing the ID of the     Activity that was sent.    Example follows.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/activities HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  [other headers]    {    \"type\": \"message\",    \"from\": {      \"id\": \"user1\"    },    \"text\": \"hello\"  }    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"id\": \"0001\"  }  ```    The client's Activity is available in the message retrieval path (either polling GET or WebSocket) and is not  returned inline.    The total time to POST a message to a Direct Line conversation is:    * Transit time to the Direct Line service,  * Internal processing time within Direct Line (typically less than 120ms)  * Transit time to the bot  * Processing time within the bot  * Transit time for HTTP responses to travel back to the client.    If the bot generates an error, that error will trigger an HTTP 502 error (\"Bad Gateway\") in  the ```POST /v3/directline/conversations/{id}/activities``` call.    ### Sending one or more attachments by URL    Clients may optionally send attachments, such as images or documents. If the client already has a URL for the  attachment, the simplest way to send it is to include the URL in the ```contentUrl``` field of an Activity  attachment object. This applies to HTTP, HTTPS, and ```data:``` URIs.    ### Sending a single attachment by upload    Often, clients have an image or document on a device but no URL that can be included in the activity.    To upload an attachment, POST a single attachment to  the ```/v3/directline/conversations/{conversationId}/upload``` endpoint. The ```Content-Type```  and ```Content-Disposition``` headers control the attachment's type and filename, respectively.    A user ID is required. Supply the ID of the user sending the attachment as a ```userId``` parameter in the URL.    If uploading a single attachment, a message activity is sent to the bot when the upload completes.    On completion, the service returns the ID of the activity that was sent.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/upload?userId=user1 HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  Content-Type: image/jpeg  Content-Disposition: name=\"file\"; filename=\"badjokeeel.jpg\"  [other headers]    [JPEG content]    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"id\": \"0003\"  }  ```    ### Sending multiple attachments by upload    If uploading multiple attachments, use ```multipart/form-data``` as the content type and include each  attachment as a separate part. Each attachment's type and filename may be included in the ```Content-Type```  and ```Content-Disposition``` headers in each part.    An activity may be included by adding a part with content type of ```application/vnd.microsoft.activity```.  Other parts in the payload are attached to this activity before it is sent. If an Activity is not included,  an empty Activity is created as a wrapper for the attachments.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/upload?userId=user1 HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  Content-Type: multipart/form-data; boundary=----DD4E5147-E865-4652-B662-F223701A8A89  [other headers]    ----DD4E5147-E865-4652-B662-F223701A8A89  Content-Type: image/jpeg  Content-Disposition: form-data; name=\"file\"; filename=\"badjokeeel.jpg\"  [other headers]    [JPEG content]    ----DD4E5147-E865-4652-B662-F223701A8A89  Content-Type: application/vnd.microsoft.activity  [other headers]    {    \"type\": \"message\",    \"from\": {      \"id\": \"user1\"    },    \"text\": \"Hey I just IM'd you\\n\\nand this is crazy\\n\\nbut here's my webhook\\n\\nso POST me maybe\"  }    ----DD4E5147-E865-4652-B662-F223701A8A89            -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"id\": \"0004\"  }  ```    ## Receiving Activities from the bot    Direct Line 3.0 clients may choose from two different mechanisms for retrieving messages:    1. A **streaming WebSocket**, which pushes messages efficiently to clients.  2. A **polling GET** interface, which is available for clients unable to use WebSockets or for clients     retrieving the conversation history.    **Not all activities are available via the polling GET interface.** A table of activity availability follows.    |Activity type|Availability|  |-------------|--------|  |Message|Polling GET and WebSocket|  |Typing|WebSocket only|  |ConversationUpdate|Not sent/received via client|  |ContactRelationUpdate|Not supported in Direct Line|  |EndOfConversation|Polling GET and WebSocket|  |All other activity types|Polling GET and WebSocket|    ### Receiving Activities by WebSocket    To connect via WebSocket, a client uses the StreamUrl when starting a conversation. The stream URL is  preauthorized and does NOT require an Authorization header containing the client's secret or token.    ```  -- connect to wss://directline.botframework.com --  GET /v3/directline/conversations/abc123/stream?t=RCurR_XV9ZA.cwA...\" HTTP/1.1  Upgrade: websocket  Connection: upgrade  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 101 Switching Protocols  [other headers]  ```    The Direct Line service sends the following messages:    * An **ActivitySet**, which contains one or more activities and a watermark (described below)  * An empty message, which the Direct Line service uses to ensure the connection is still valid  * Additional types, to be defined later. These types are identified by the properties in the JSON root.    ActivitySets contain messages sent by the bot and by all users. Example ActivitySet:    ```  {    \"activities\": [{      \"type\": \"message\",      \"channelId\": \"directline\",      \"conversation\": {        \"id\": \"abc123\"      },      \"id\": \"abc123|0000\",      \"from\": {        \"id\": \"user1\"      },      \"text\": \"hello\"    }],    \"watermark\": \"0000a-42\"  }  ```    Clients should keep track of the \"watermark\" value from each ActivitySet so they can use it on reconnect.  **Note** that a ```null``` or missing watermark should be ignored and should not overwrite a prior watermark  in the client.    Clients should ignore empty messages.    Clients may send their own empty messages to verify connectivity. The Direct Line service will ignore these.    The service may forcibly close the connection under certain conditions. If the client has not received an  EndOfConversation activity, it may reconnect by issuing a GET request to the conversation endpoint to get a  new stream URL (see above).    The WebSocket stream contains live updates and very recent messages (since the call to get the WebSocket call  was issued) but it does not include messages sent prior to the most recent POST  to ```/v3/directline/conversations/{id}```. To retrieve messages sent earlier in the conversation, use the  GET mechanism below.    ### Receiving Activities by GET    The GET mechanism is useful for clients who are unable to use the WebSocket, or for clients wishing to retrieve  the conversation history.    To retrieve messages, issue a GET call to the conversation endpoint. Optionally supply a watermark, indicating  the most recent message seen. The watermark field accompanies all GET/WebSocket messages as a property in the  ActivitySet.    ```  -- connect to directline.botframework.com --  GET /v3/directline/conversations/abc123/activities?watermark=0001a-94 HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  [other headers]    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"activities\": [{      \"type\": \"message\",      \"channelId\": \"directline\",      \"conversation\": {        \"id\": \"abc123\"      },      \"id\": \"abc123|0000\",      \"from\": {        \"id\": \"user1\"      },      \"text\": \"hello\"    }, {      \"type\": \"message\",      \"channelId\": \"directline\",      \"conversation\": {        \"id\": \"abc123\"      },      \"id\": \"abc123|0001\",      \"from\": {        \"id\": \"bot1\"      },      \"text\": \"Nice to see you, user1!\"    }],    \"watermark\": \"0001a-95\"  }  ```    Clients should page through the available activities by advancing the ```watermark``` value until no activities  are returned.      ### Timing considerations     Most clients wish to retain a complete message history. Even though Direct Line is a multi-part protocol with  potential timing gaps, the protocol and service is designed to make it easy to build a reliable client.    1. The ```watermark``` field sent in the WebSocket stream and GET response is reliable. You will not miss     messages as long as you replay the watermark verbatim.  2. When starting a conversation and connecting to the WebSocket stream, any Activities sent after the POST but     before the socket is opened are replayed before new messages.  3. When refreshing history by GET call while connected to the WebSocket, Activities may be duplicated across both     channels. Keeping a list of all known Activity IDs will allow you to reject duplicate messages should they occur.    Clients using the polling GET interface should choose a polling interval that matches their intended use.    * Service-to-service applications often use a polling interval of 5s or 10s.  * Client-facing applications often use a polling interval of 1s, and fire an additional request ~300ms after    every message the client sends to rapidly pick up a bot's response. This 300ms delay should be adjusted    based on the bot's speed and transit time.    ## Ending a conversation    Either a client or a bot may signal the end of a DirectLine conversation. This operation halts communication  and prevents the bot and the client from sending messages. Messages may still be retrieved via the GET mechanism.  Sending this messages is as simple as POSTing an EndOfConversation activity.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/activities HTTP/1.1  Authorization: Bearer RCurR_XV9ZA.cwA.BKA.iaJrC8xpy8qbOF5xnR2vtCX7CZj0LdjAPGfiCpg4Fv0  [other headers]    {    \"type\": \"endOfConversation\",    \"from\": {      \"id\": \"user1\"    }  }    -- response from directline.botframework.com --  HTTP/1.1 200 OK  [other headers]    {    \"id\": \"0004\"  }  ```    ## REST API errors    HTTP calls to the Direct Line service follow standard HTTP error conventions:    * 2xx status codes indicate success. (Direct Line 3.0 uses 200 and 201.)  * 4xx status codes indicate an error in your request.    * 401 indicates a missing or malformed Authorization header (or URL token, in calls where a token parameter      is allowed).    * 403 indicates an unauthorized client.      * If calling with a valid but expired token, the ```code``` field is set to ```TokenExpired```.    * 404 indicates a missing path, site, conversation, etc.  * 5xx status codes indicate a service-side error.    * 500 indicates an error inside the Direct Line service.    * 502 indicates an error was returned by the bot. **This is a common error code.**  * 101 is used in the WebSocket connection path, although this is likely handled by your WebSocket client.    When an error message is returned, error detail may be present in a JSON response. Look for an ```error```  property with ```code``` and ```message``` fields.    ```  -- connect to directline.botframework.com --  POST /v3/directline/conversations/abc123/activities HTTP/1.1  [detail omitted]    -- response from directline.botframework.com --  HTTP/1.1 502 Bad Gateway  [other headers]    {    \"error\": {      \"code\": \"BotRejectedActivity\",      \"message\": \"Failed to send activity: bot returned an error\"    }  }  ```    The contents of the ```message``` field may change. The HTTP status code and values in the ```code```  property are stable.    # Schema    The Direct Line 3.0 schema is identical to the Bot Framework v3 schema.    When a bot sends an Activity to a client through Direct Line:    * attachment cards are preserved,  * URLs for uploaded attachments are hidden with a private link, and  * the ```channelData``` property is preserved without modification.    When a client sends an Activity to a bot through Direct Line:    * the ```type``` property contains the kind of activity you are sending (typically ```message```),  * the ```from``` property must be populated with a user ID, chosen by your client,  * attachments may contain URLs to existing resources or URLs uploaded through the Direct Line attachment    endpoint, and  * the ```channelData``` property is preserved without modification.    Clients and bots may send Activities of any type, including Message Activities, Typing Activities, and  custom Activity types.    Clients may send a single Activity at a time.    ```  {    \"type\": \"message\",    \"channelId\": \"directline\",    \"from\": {      \"id\": \"user1\"    },    \"text\": \"hello\"  }  ```    Clients receive multiple Activities as part of an ActivitySet. The ActivitySet has an array of activities  and a watermark field.    ```  {    \"activities\": [{      \"type\": \"message\",      \"channelId\": \"directline\",      \"conversation\": {        \"id\": \"abc123\"      },      \"id\": \"abc123|0000\",      \"from\": {        \"id\": \"user1\"      },      \"text\": \"hello\"    }],    \"watermark\": \"0000a-42\"  }  ```    # Libraries for the Direct Line API    The Direct Line API is designed to be coded directly, but the Bot Framework includes libraries and controls that  help you to embed Direct-Line-powered bots into your application.    * The [Bot Framework Web Chat control](https://github.com/Microsoft/BotFramework-WebChat) is an easy way to embed    the Direct Line protocol into a webpage.  * [Direct Line Nuget package](https://www.nuget.org/packages/Microsoft.Bot.Connector.DirectLine) with libraries for    .Net 4.5, UWP, and .Net Standard.  * [DirectLineJs](https://github.com/Microsoft/BotFramework-DirectLineJs), also available on    [NPM](https://www.npmjs.com/package/botframework-directlinejs)  * You may generate your own from the [Direct Line Swagger file](swagger.json)    Our [BotBuilder-Samples GitHub repo](https://github.com/Microsoft/BotBuilder-Samples) also contains samples for    [C#](https://github.com/Microsoft/BotBuilder-Samples/tree/master/CSharp/core-DirectLine) and    [JavaScript](https://github.com/Microsoft/BotBuilder-Samples/tree/master/Node/core-DirectLine).
 *
 * OpenAPI spec version: v3
 * Contact: botframework@microsoft.com
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */
import localVarRequest = require('request');
import http = require('http');
import Promise = require('bluebird');
/**
* An Activity is the basic communication type for the Bot Framework 3.0 protocol
*/
export declare class Activity {
    /**
    * The type of the activity [message|contactRelationUpdate|converationUpdate|typing|endOfConversation|event|invoke]
    */
    'type': string;
    /**
    * ID of this activity
    */
    'id': string;
    /**
    * UTC Time when message was sent (set by service)
    */
    'timestamp': Date;
    /**
    * Local time when message was sent (set by client, Ex: 2016-09-23T13:07:49.4714686-07:00)
    */
    'localTimestamp': Date;
    /**
    * Service endpoint where operations concerning the activity may be performed
    */
    'serviceUrl': string;
    /**
    * ID of the channel where the activity was sent
    */
    'channelId': string;
    /**
    * Sender address
    */
    'from': ChannelAccount;
    /**
    * Conversation
    */
    'conversation': ConversationAccount;
    /**
    * (Outbound to bot only) Bot's address that received the message
    */
    'recipient': ChannelAccount;
    /**
    * Format of text fields [plain|markdown] Default:markdown
    */
    'textFormat': string;
    /**
    * Hint for how to deal with multiple attachments: [list|carousel] Default:list
    */
    'attachmentLayout': string;
    /**
    * Array of address added
    */
    'membersAdded': Array<ChannelAccount>;
    /**
    * Array of addresses removed
    */
    'membersRemoved': Array<ChannelAccount>;
    /**
    * Conversations new topic name
    */
    'topicName': string;
    /**
    * True if the previous history of the channel is disclosed
    */
    'historyDisclosed': boolean;
    /**
    * The language code of the Text field
    */
    'locale': string;
    /**
    * Content for the message
    */
    'text': string;
    /**
    * SSML Speak for TTS audio response
    */
    'speak': string;
    /**
    * Indicates whether the bot is accepting, expecting, or ignoring input
    */
    'inputHint': string;
    /**
    * Text to display if the channel cannot render cards
    */
    'summary': string;
    /**
    * SuggestedActions are used to provide keyboard/quickreply like behavior in many clients
    */
    'suggestedActions': SuggestedActions;
    /**
    * Attachments
    */
    'attachments': Array<Attachment>;
    /**
    * Collection of Entity objects, each of which contains metadata about this activity. Each Entity object is typed.
    */
    'entities': Array<Entity>;
    /**
    * Channel-specific payload
    */
    'channelData': ModelObject;
    /**
    * ContactAdded/Removed action
    */
    'action': string;
    /**
    * The original ID this message is a response to
    */
    'replyToId': string;
    /**
    * Open-ended value
    */
    'value': ModelObject;
    /**
    * Name of the operation to invoke or the name of the event
    */
    'name': string;
    /**
    * Reference to another conversation or activity
    */
    'relatesTo': ConversationReference;
    /**
    * Code indicating why the conversation has ended
    */
    'code': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A collection of activities
*/
export declare class ActivitySet {
    /**
    * Activities
    */
    'activities': Array<Activity>;
    /**
    * Maximum watermark of activities within this set
    */
    'watermark': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An animation card (Ex: gif or short video clip)
*/
export declare class AnimationCard {
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Subtitle of the card
    */
    'subtitle': string;
    /**
    * Text of the card
    */
    'text': string;
    /**
    * Thumbnail placeholder
    */
    'image': ThumbnailUrl;
    /**
    * Array of media Url objects
    */
    'media': Array<MediaUrl>;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    /**
    * Is it OK for this content to be shareable with others (default:true)
    */
    'shareable': boolean;
    /**
    * Should the client loop playback at end of content (default:true)
    */
    'autoloop': boolean;
    /**
    * Should the client automatically start playback of video in this card (default:true)
    */
    'autostart': boolean;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An attachment within an activity
*/
export declare class Attachment {
    /**
    * mimetype/Contenttype for the file
    */
    'contentType': string;
    /**
    * Content Url
    */
    'contentUrl': string;
    /**
    * Embedded content
    */
    'content': ModelObject;
    /**
    * (OPTIONAL) The name of the attachment
    */
    'name': string;
    /**
    * (OPTIONAL) Thumbnail associated with attachment
    */
    'thumbnailUrl': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A audio card
*/
export declare class AudioCard {
    /**
    * Aspect ratio of thumbnail/media placeholder, allowed values are \"16x9\" and \"9x16\"
    */
    'aspect': string;
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Subtitle of the card
    */
    'subtitle': string;
    /**
    * Text of the card
    */
    'text': string;
    /**
    * Thumbnail placeholder
    */
    'image': ThumbnailUrl;
    /**
    * Array of media Url objects
    */
    'media': Array<MediaUrl>;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    /**
    * Is it OK for this content to be shareable with others (default:true)
    */
    'shareable': boolean;
    /**
    * Should the client loop playback at end of content (default:true)
    */
    'autoloop': boolean;
    /**
    * Should the client automatically start playback of video in this card (default:true)
    */
    'autostart': boolean;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An action on a card
*/
export declare class CardAction {
    /**
    * Defines the type of action implemented by this button.
    */
    'type': string;
    /**
    * Text description which appear on the button.
    */
    'title': string;
    /**
    * URL Picture which will appear on the button, next to text label.
    */
    'image': string;
    /**
    * Supplementary parameter for action. Content of this property depends on the ActionType
    */
    'value': ModelObject;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An image on a card
*/
export declare class CardImage {
    /**
    * URL Thumbnail image for major content property.
    */
    'url': string;
    /**
    * Image description intended for screen readers
    */
    'alt': string;
    /**
    * Action assigned to specific Attachment.E.g.navigate to specific URL or play/open media content
    */
    'tap': CardAction;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Channel account information needed to route a message
*/
export declare class ChannelAccount {
    /**
    * Channel id for the user or bot on this channel (Example: joe@smith.com, or @joesmith or 123456)
    */
    'id': string;
    /**
    * Display friendly name
    */
    'name': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An object representing a conversation or a conversation token
*/
export declare class Conversation {
    /**
    * ID for this conversation
    */
    'conversationId': string;
    /**
    * Token scoped to this conversation
    */
    'token': string;
    /**
    * Expiration for token
    */
    'expiresIn': number;
    /**
    * URL for this conversation's message stream
    */
    'streamUrl': string;
    /**
    * ID for the reference grammar for this bot
    */
    'referenceGrammarId': string;
    'eTag': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Channel account information for a conversation
*/
export declare class ConversationAccount {
    /**
    * Is this a reference to a group
    */
    'isGroup': boolean;
    /**
    * Channel id for the user or bot on this channel (Example: joe@smith.com, or @joesmith or 123456)
    */
    'id': string;
    /**
    * Display friendly name
    */
    'name': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An object relating to a particular point in a conversation
*/
export declare class ConversationReference {
    /**
    * (Optional) ID of the activity to refer to
    */
    'activityId': string;
    /**
    * (Optional) User participating in this conversation
    */
    'user': ChannelAccount;
    /**
    * Bot participating in this conversation
    */
    'bot': ChannelAccount;
    /**
    * Conversation reference
    */
    'conversation': ConversationAccount;
    /**
    * Channel ID
    */
    'channelId': string;
    /**
    * Service endpoint where operations concerning the referenced conversation may be performed
    */
    'serviceUrl': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Object of schema.org types
*/
export declare class Entity {
    /**
    * Entity Type (typically from schema.org types)
    */
    'type': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An HTTP API response
*/
export declare class ErrorResponse {
    /**
    * Error message
    */
    'error': Error;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Set of key-value pairs. Advantage of this section is that key and value properties will be               rendered with default style information with some delimiter between them. So there is no need for developer to specify style information.
*/
export declare class Fact {
    /**
    * The key for this Fact
    */
    'key': string;
    /**
    * The value for this Fact
    */
    'value': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* GeoCoordinates (entity type: \"https://schema.org/GeoCoordinates\")
*/
export declare class GeoCoordinates {
    /**
    * Elevation of the location [WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)
    */
    'elevation': number;
    /**
    * Latitude of the location [WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)
    */
    'latitude': number;
    /**
    * Longitude of the location [WGS 84](https://en.wikipedia.org/wiki/World_Geodetic_System)
    */
    'longitude': number;
    /**
    * The type of the thing
    */
    'type': string;
    /**
    * The name of the thing
    */
    'name': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A Hero card (card with a single, large image)
*/
export declare class HeroCard {
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Subtitle of the card
    */
    'subtitle': string;
    /**
    * Text for the card
    */
    'text': string;
    /**
    * Array of images for the card
    */
    'images': Array<CardImage>;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    /**
    * This action will be activated when user taps on the card itself
    */
    'tap': CardAction;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* MediaUrl data
*/
export declare class MediaUrl {
    /**
    * Url for the media
    */
    'url': string;
    /**
    * Optional profile hint to the client to differentiate multiple MediaUrl objects from each other
    */
    'profile': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Mention information (entity type: \"mention\")
*/
export declare class Mention {
    /**
    * The mentioned user
    */
    'mentioned': ChannelAccount;
    /**
    * Sub Text which represents the mention (can be null or empty)
    */
    'text': string;
    /**
    * Entity Type (typically from schema.org types)
    */
    'type': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Object representing error information
*/
export declare class ModelError {
    /**
    * Error code
    */
    'code': string;
    /**
    * Error message
    */
    'message': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
export declare class ModelObject {
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Place (entity type: \"https://schema.org/Place\")
*/
export declare class Place {
    /**
    * Address of the place (may be `string` or complex object of type `PostalAddress`)
    */
    'address': ModelObject;
    /**
    * Geo coordinates of the place (may be complex object of type `GeoCoordinates` or `GeoShape`)
    */
    'geo': ModelObject;
    /**
    * Map to the place (may be `string` (URL) or complex object of type `Map`)
    */
    'hasMap': ModelObject;
    /**
    * The type of the thing
    */
    'type': string;
    /**
    * The name of the thing
    */
    'name': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A receipt card
*/
export declare class ReceiptCard {
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Array of Receipt Items
    */
    'items': Array<ReceiptItem>;
    /**
    * Array of Fact Objects   Array of key-value pairs.
    */
    'facts': Array<Fact>;
    /**
    * This action will be activated when user taps on the card
    */
    'tap': CardAction;
    /**
    * Total amount of money paid (or should be paid)
    */
    'total': string;
    /**
    * Total amount of TAX paid(or should be paid)
    */
    'tax': string;
    /**
    * Total amount of VAT paid(or should be paid)
    */
    'vat': string;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* An item on a receipt card
*/
export declare class ReceiptItem {
    /**
    * Title of the Card
    */
    'title': string;
    /**
    * Subtitle appears just below Title field, differs from Title in font styling only
    */
    'subtitle': string;
    /**
    * Text field appears just below subtitle, differs from Subtitle in font styling only
    */
    'text': string;
    /**
    * Image
    */
    'image': CardImage;
    /**
    * Amount with currency
    */
    'price': string;
    /**
    * Number of items of given kind
    */
    'quantity': string;
    /**
    * This action will be activated when user taps on the Item bubble.
    */
    'tap': CardAction;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A response containing a resource ID
*/
export declare class ResourceResponse {
    /**
    * Id of the resource
    */
    'id': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A card representing a request to sign in
*/
export declare class SigninCard {
    /**
    * Text for signin request
    */
    'text': string;
    /**
    * Action to use to perform signin
    */
    'buttons': Array<CardAction>;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* SuggestedActions that can be performed
*/
export declare class SuggestedActions {
    /**
    * Ids of the recipients that the actions should be shown to.  These Ids are relative to the channelId and a subset of all recipients of the activity
    */
    'to': Array<string>;
    /**
    * Actions that can be shown to the user
    */
    'actions': Array<CardAction>;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Thing (entity type: \"https://schema.org/Thing\")
*/
export declare class Thing {
    /**
    * The type of the thing
    */
    'type': string;
    /**
    * The name of the thing
    */
    'name': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A thumbnail card (card with a single, small thumbnail image)
*/
export declare class ThumbnailCard {
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Subtitle of the card
    */
    'subtitle': string;
    /**
    * Text for the card
    */
    'text': string;
    /**
    * Array of images for the card
    */
    'images': Array<CardImage>;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    /**
    * This action will be activated when user taps on the card itself
    */
    'tap': CardAction;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Object describing a media thumbnail
*/
export declare class ThumbnailUrl {
    /**
    * url pointing to an thumbnail to use for media content
    */
    'url': string;
    /**
    * Alt text to display for screen readers on the thumbnail image
    */
    'alt': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* Parameters for creating a token
*/
export declare class TokenParameters {
    /**
    * User account to embed within the token
    */
    'user': ChannelAccount;
    'eTag': string;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
/**
* A video card
*/
export declare class VideoCard {
    /**
    * Aspect ratio (16:9)(4:3)
    */
    'aspect': string;
    /**
    * Title of the card
    */
    'title': string;
    /**
    * Subtitle of the card
    */
    'subtitle': string;
    /**
    * Text of the card
    */
    'text': string;
    /**
    * Thumbnail placeholder
    */
    'image': ThumbnailUrl;
    /**
    * Array of media Url objects
    */
    'media': Array<MediaUrl>;
    /**
    * Set of actions applicable to the current card
    */
    'buttons': Array<CardAction>;
    /**
    * Is it OK for this content to be shareable with others (default:true)
    */
    'shareable': boolean;
    /**
    * Should the client loop playback at end of content (default:true)
    */
    'autoloop': boolean;
    /**
    * Should the client automatically start playback of video in this card (default:true)
    */
    'autostart': boolean;
    static discriminator: any;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
export interface Authentication {
    /**
    * Apply authentication settings to header and query params.
    */
    applyToRequest(requestOptions: localVarRequest.Options): void;
}
export declare class HttpBasicAuth implements Authentication {
    username: string;
    password: string;
    applyToRequest(requestOptions: localVarRequest.Options): void;
}
export declare class ApiKeyAuth implements Authentication {
    private location;
    private paramName;
    apiKey: string;
    constructor(location: string, paramName: string);
    applyToRequest(requestOptions: localVarRequest.Options): void;
}
export declare class OAuth implements Authentication {
    accessToken: string;
    applyToRequest(requestOptions: localVarRequest.Options): void;
}
export declare class VoidAuth implements Authentication {
    username: string;
    password: string;
    applyToRequest(_: localVarRequest.Options): void;
}
export declare enum ConversationsApiApiKeys {
}
export declare class ConversationsApi {
    protected _basePath: string;
    protected defaultHeaders: any;
    protected _useQuerystring: boolean;
    protected authentications: {
        'default': Authentication;
    };
    constructor(basePath?: string);
    useQuerystring: boolean;
    basePath: string;
    setDefaultAuthentication(auth: Authentication): void;
    setApiKey(key: ConversationsApiApiKeys, value: string): void;
    /**
     *
     * @summary Get activities in this conversation. This method is paged with the 'watermark' parameter.
     * @param conversationId Conversation ID
     * @param watermark (Optional) only returns activities newer than this watermark
     */
    conversationsGetActivities(conversationId: string, watermark?: string): Promise<{
        response: http.ClientResponse;
        body: ActivitySet;
    }>;
    /**
     *
     * @summary Send an activity
     * @param conversationId Conversation ID
     * @param activity Activity to send
     */
    conversationsPostActivity(conversationId: string, activity: Activity): Promise<{
        response: http.ClientResponse;
        body: ResourceResponse;
    }>;
    /**
     *
     * @summary Get information about an existing conversation
     * @param conversationId
     * @param watermark
     */
    conversationsReconnectToConversation(conversationId: string, watermark?: string): Promise<{
        response: http.ClientResponse;
        body: Conversation;
    }>;
    /**
     *
     * @summary Start a new conversation
     */
    conversationsStartConversation(): Promise<{
        response: http.ClientResponse;
        body: Conversation;
    }>;
    /**
     *
     * @summary Upload file(s) and send as attachment(s)
     * @param conversationId
     * @param file
     * @param userId
     */
    conversationsUpload(conversationId: string, file: Buffer, userId?: string): Promise<{
        response: http.ClientResponse;
        body: ResourceResponse;
    }>;
}
export declare enum TokensApiApiKeys {
}
export declare class TokensApi {
    protected _basePath: string;
    protected defaultHeaders: any;
    protected _useQuerystring: boolean;
    protected authentications: {
        'default': Authentication;
    };
    constructor(basePath?: string);
    useQuerystring: boolean;
    basePath: string;
    setDefaultAuthentication(auth: Authentication): void;
    setApiKey(key: TokensApiApiKeys, value: string): void;
    /**
     *
     * @summary Generate a token for a new conversation
     * @param tokenParameters
     */
    tokensGenerateTokenForNewConversation(tokenParameters?: TokenParameters): Promise<{
        response: http.ClientResponse;
        body: Conversation;
    }>;
    /**
     *
     * @summary Refresh a token
     */
    tokensRefreshToken(): Promise<{
        response: http.ClientResponse;
        body: Conversation;
    }>;
}
