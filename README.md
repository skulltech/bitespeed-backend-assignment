# bitespeed-backend-assignment

Recruitment assignment for SDE 1 position at BiteSpeed

Live @ `bitespeed-backend-assignment.vercel.app/identify`.

P.S: My resume is available at [`resume-sumit-ghosh.pdf`](resume-sumit-ghosh.pdf).

## Local development

1. Bring up a local Postgres instance by running
   ```
   docker compose up
   ```
2. Apply database migrations by running
   ```
   yarn prisma migrate dev
   ```
3. Run the Fastify server using
   ```
   yarn start
   ```

## Testing

Stop the any local Postgres instance if running. Then run

```
yarn test
```
