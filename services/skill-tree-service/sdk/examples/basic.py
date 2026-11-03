"""Demo 1: Gửi prompt đơn giản."""
import asyncio
from dsh_web_sdk import DshClient


async def main():
    async with DshClient() as client:
        session = await client.create_session()
        print(f"Session: {session.session_id}")
        print(f"View:    {client.base_url}/?token={client.token}")

        result = await session.run("What is 2+2? Answer in one word.")
        print(f"Result:  {result['final_text']}")


if __name__ == "__main__":
    asyncio.run(main())