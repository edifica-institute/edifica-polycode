# OpenJDK 17, slim
FROM eclipse-temurin:17-jdk-jammy

# Create non-root user
RUN useradd -m -u 10001 sandbox
USER sandbox

# Workdir for runs
WORKDIR /workspace

# Keep image lean; no shell history etc.
# JIT warmup not needed here

# Default command no-op (server controls commands)
CMD ["bash", "-lc", "echo Ready"]
