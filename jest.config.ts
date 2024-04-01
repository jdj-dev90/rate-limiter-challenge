export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
	verbose: true,
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	}
};
