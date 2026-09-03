# Build Stage
FROM node:20-alpine AS build
RUN npm install -g pnpm
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
# pnpm 10+ aborts install when a dependency's build script is not pre-approved
# (ERR_PNPM_IGNORED_BUILDS). esbuild/sharp resolve their platform binaries via
# optionalDependencies, so skipping lifecycle scripts is safe here.
RUN pnpm install --ignore-scripts
COPY . .
RUN pnpm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
