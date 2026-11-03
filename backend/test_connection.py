from app.db.database import test_connection

try:
    result = test_connection()
    print("Database connection successful!")
    print("Test query result:", result)

except Exception as error:
    print("Database connection failed.")
    print("Error type:", type(error).__name__)

    # Print the error while masking the database URL's credentials.
    message = str(error)
    from app.db.database import DATABASE_URL

    if DATABASE_URL:
        message = message.replace(DATABASE_URL, "[DATABASE_URL HIDDEN]")

    print("Error details:", message)
