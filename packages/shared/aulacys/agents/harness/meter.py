from __future__ import annotations

from time import perf_counter


class NodeTimer:
    def __init__(self) -> None:
        self.started = perf_counter()

    def elapsed_ms(self) -> int:
        return int((perf_counter() - self.started) * 1000)
