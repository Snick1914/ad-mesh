# Build Stage
FROM debian:bookworm-slim AS build

# Install dependencies needed for Flutter
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Clone the Flutter SDK stable branch
RUN git clone https://github.com/flutter/flutter.git -b stable /usr/local/flutter

# Set flutter path
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Workaround for tar ownership errors in rootless podman/docker environments
RUN mv /usr/bin/tar /usr/bin/tar.real && \
    echo '#!/bin/sh\nexec /usr/bin/tar.real --no-same-owner --no-same-permissions "$@"' > /usr/bin/tar && \
    chmod +x /usr/bin/tar

# Pre-download development binaries and enable web build support
RUN flutter doctor
RUN flutter config --enable-web

# Set working directory
WORKDIR /app

# Copy dependency definitions and resolve them
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Copy all source files
COPY . .

# Ensure the project is configured for web building
RUN flutter create . --platforms web

# Build the Flutter Web application release bundle
RUN flutter build web --release

# Production Stage
FROM docker.io/library/nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
