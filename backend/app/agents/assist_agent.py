"""Chat assistant agent (owner: Bordos). STUB with the contract signature, so the API and
the frontend can be built in parallel. Bordos replaces the body, never the signature.
"""

from app.schemas import ChatAction, ChatContext, ChatMessage, ChatReply


def assist(messages: list[ChatMessage], context: ChatContext) -> ChatReply:
    return ChatReply(
        text=(
            f"Sunt asistentul CityMind (variantă de test). Întrebarea consultării este: "
            f"„{context.question}”. Te pot ajuta să răspunzi, să votezi sau să înțelegi harta."
        ),
        action=ChatAction(type="none"),
    )
