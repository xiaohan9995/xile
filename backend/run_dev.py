from app import create_app


app = create_app({"SEED_DEMO_DATA": True, "ADMIN_DEV_TOKEN": "dev-admin-token"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
